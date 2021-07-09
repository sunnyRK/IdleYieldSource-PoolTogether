// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@pooltogether/fixed-point/contracts/FixedPoint.sol";

import "./interfaces/pooltogether/IProtocolYieldSource.sol";
import "./interfaces/idle/IIdleToken.sol";
import "./access/AssetManager.sol";

/// @title A PoolTogether yield source for Idle Token
/// @author Sunny Radadiya
contract IdleYieldSource is IProtocolYieldSource, Initializable, ReentrancyGuardUpgradeable, ERC20Upgradeable, AssetManager  {
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice Emitted when the yield source is initialized
    event IdleYieldSourceInitialized(
        address indexed idleToken,
        address indexed referralAddress
    );

    /// @notice Emitted when asset tokens are redeemed from the yield source
    event RedeemedToken(
        address indexed from,
        uint256 shares,
        uint256 amount
    );

    /// @notice Emitted when asset tokens are supplied to the yield source
    event SuppliedTokenTo(
        address indexed from,
        uint256 shares,
        uint256 amount,
        address indexed to
    );

    /// @notice Emitted when asset tokens are supplied to sponsor the yield source
    event Sponsored(
        address indexed from,
        uint256 amount
    );

    /// @notice Emitted when ERC20 tokens other than yield source's idleToken are withdrawn from the yield source
    event TransferredERC20(
        address indexed from,
        address indexed to,
        uint256 amount,
        address indexed token
    );

    /// @notice Emitted when referralAddress is updated by the owner
    event ReferralAddress(
        address indexed referralAddress
    );

    /// @notice Emitted when skipWholeRebalance is updated by the owner
    event Rebalance(
        bool skipRebalance
    );
    
    /// @notice Interface for the yield-bearing Idle Token (eg: IdleDAI, IdleUSDC, etc...)
    IIdleToken public idleToken;

    /// @notice Address for Idle referral rewards
    address public referralAddress;

    /// @dev IdleToken has 18 decimals
    uint256 private constant ONE_IDLE_TOKEN = 10**18;

    /// @notice IdleToken boolean to skip the rebalance or not
    /// @dev Set to `false`, it will rebalance and keep allocations up to date
    bool private skipWholeRebalance = false;

    /// @notice Initializes the yield source with Idle Token
    /// @param _idleToken Idle Token address
    function initialize(
        IIdleToken _idleToken,
        address _referralAddress
    ) public initializer {
        require(address(_idleToken) != address(0), "IdleYieldSource/idleToken-not-zero-address");
        idleToken = _idleToken;

        require(address(_referralAddress) != address(0), "IdleYieldSource/referralAddress-not-zero-address");
        referralAddress = _referralAddress;

        __Ownable_init();
        __ERC20_init("IdleMintShare", "IMT");
        __ReentrancyGuard_init();

        IERC20Upgradeable _underlyingAsset = IERC20Upgradeable(_idleToken.token());
        _underlyingAsset.safeApprove(address(_idleToken), type(uint256).max);

        emit IdleYieldSourceInitialized(address(_idleToken), _referralAddress);
    }

    /// @notice Set Idle referral address
    /// @dev Referral address can't be address zero
    /// @dev This function is only callable by the owner or asset manager
    /// @return true if operation is successful
    function setReferralAddress(address _referralAddress) external onlyOwner returns (bool) {
        require(address(_referralAddress) != address(0), "IdleYieldSource/referralAddress-not-zero-address");
        referralAddress = _referralAddress;
        emit ReferralAddress(_referralAddress);
        return true;
    }

    /// @notice Set Idle token skipWholeRebalance boolean used in the `idleToken.mintIdleToken()` function
    /// @dev This function is only callable by the owner or asset manager
    /// @return true if operation is successful
    function setRebalance(bool skipRebalance) external onlyOwner returns (bool) {
        emit Rebalance(skipRebalance);
        return skipWholeRebalance = skipRebalance;
    }

    /// @notice Approve Idle token contract to spend max uint256 amount
    /// @dev Emergency function to re-approve max amount if approval amount dropped too low
    /// @return true if operation is successful
    function approveMaxAmount() external onlyOwner returns (bool) {
        IIdleToken _idleToken = idleToken;
        IERC20Upgradeable _underlyingAsset = IERC20Upgradeable(_idleToken.token());
        uint256 allowance = _underlyingAsset.allowance(address(this), address(_idleToken));

        _underlyingAsset.safeIncreaseAllowance(address(_idleToken), type(uint256).max.sub(allowance));
        return true;
    }

    /// @notice Returns the ERC20 asset token used for deposits.
    /// @return The ERC20 asset token
    function depositToken() external view override returns (address) {
        return _tokenAddress();
    }

    /// @notice Returns the underlying asset token address
    /// @return Underlying asset token address
    function _tokenAddress() internal view returns (address) {
        return idleToken.token();
    }

    /// @notice Returns the total balance (in asset tokens).  This includes the deposits and interest.
    /// @return The underlying balance of asset tokens
    function balanceOfToken(address addr) external view override returns (uint256) {
        return _sharesToToken(balanceOf(addr));
    }

    /// @notice Calculates the current price per share
    /// @return Average idleToken price for this contract
    function _price() internal view returns (uint256) {
      return idleToken.tokenPriceWithFee(address(this));
    }

    /// @notice Calculates the number of shares that should be mint or burned when a user deposit or withdraw
    /// @param tokens Amount of tokens
    /// @return Number of shares
    function _tokenToShares(uint256 tokens) internal view returns (uint256) {
        uint256 shares = 0;
        uint256 totalSupply = totalSupply();

        if (totalSupply == 0) {
            shares = tokens;
        } else {
            // rate = tokens / shares
            // shares = tokens * (totalShares / yieldSourceTotalSupply)
            uint256 exchangeMantissa = FixedPoint.calculateMantissa(totalSupply, idleToken.balanceOf(address(this)).mul(_price()).div(ONE_IDLE_TOKEN));
            shares = FixedPoint.multiplyUintByMantissa(tokens, exchangeMantissa);
        }

        return shares;
    }

    /// @notice Calculates the number of tokens a user has in the yield source
    /// @param shares Amount of shares
    /// @return Number of tokens
    function _sharesToToken(uint256 shares) internal view returns (uint256) {
        uint256 tokens = 0;
        uint256 totalSupply = totalSupply();

        if (totalSupply == 0) {
            tokens = shares;
        } else {
            // tokens = shares * (yieldSourceTotalSupply / totalShares)
            uint256 exchangeMantissa = FixedPoint.calculateMantissa(idleToken.balanceOf(address(this)).mul(_price()).div(ONE_IDLE_TOKEN), totalSupply);
            tokens = FixedPoint.multiplyUintByMantissa(shares, exchangeMantissa);
        }

        return tokens;
    }

    /// @notice Deposit asset tokens to Idle
    /// @param mintAmount The amount of asset tokens to be deposited
    /// @return number of minted tokens
    function _depositToIdle(uint256 mintAmount) internal returns (uint256) {
        IERC20Upgradeable(_tokenAddress()).safeTransferFrom(msg.sender, address(this), mintAmount);
        return idleToken.mintIdleToken(mintAmount, skipWholeRebalance, referralAddress);
    }

    /// @notice Allows assets to be supplied on other user's behalf using the `to` param.
    /// @param mintAmount The amount of `token()` to be supplied
    /// @param to The user whose balance will receive the tokens
    function supplyTokenTo(uint256 mintAmount, address to) external nonReentrant override {
        uint256 mintedTokenShares = _tokenToShares(mintAmount);

        _depositToIdle(mintAmount);
        _mint(to, mintedTokenShares);

        emit SuppliedTokenTo(msg.sender, mintedTokenShares, mintAmount, to);
    }

    /// @notice Redeems tokens from the yield source from the msg.sender, it burn yield bearing tokens and return token to the sender.
    /// @param redeemAmount The amount of `token()` to withdraw.  Denominated in `token()` as above.
    /// @return The actual amount of tokens that were redeemed.
    function redeemToken(uint256 redeemAmount) external override nonReentrant returns (uint256) {
        IERC20Upgradeable _depositToken = IERC20Upgradeable(_tokenAddress());

        uint256 shares = _tokenToShares(redeemAmount);
        _burn(msg.sender, shares);

        uint256 redeemedTokens = idleToken.redeemIdleToken(redeemAmount);
        _depositToken.safeTransfer(msg.sender, redeemedTokens);

        emit RedeemedToken(msg.sender, shares, redeemAmount);
        return redeemedTokens;
    }

    /// @notice Transfer ERC20 tokens other than the idleTokens held by this contract to the recipient address
    /// @dev This function is only callable by the owner or asset manager
    /// @param erc20Token The ERC20 token to transfer
    /// @param to The recipient of the tokens
    /// @param amount The amount of tokens to transfer
    function transferERC20(address erc20Token, address to, uint256 amount) external override onlyOwnerOrAssetManager {
        require(erc20Token != address(idleToken), "IdleYieldSource/idleToken-transfer-not-allowed");
        IERC20Upgradeable(erc20Token).safeTransfer(to, amount);
        emit TransferredERC20(msg.sender, to, amount, erc20Token);
    }

    /// @notice Allows someone to deposit into the yield source without receiving any shares
    /// @dev This allows anyone to distribute tokens among the share holders
    /// @param amount The amount of tokens to deposit
    function sponsor(uint256 amount) external override nonReentrant {
        _depositToIdle(amount);
        emit Sponsored(msg.sender, amount);
    }
}

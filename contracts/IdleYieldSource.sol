// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol"; 
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./interfaces/pooltogether/IProtocolYieldSource.sol";
import "./interfaces/idle/IIdleToken.sol";
import "./interfaces/idle/IIdleTokenHelper.sol";

/// @title An pooltogether yield source for Idle token
/// @author Sunny Radadiya
contract IdleYieldSource is IProtocolYieldSource, Initializable, ReentrancyGuardUpgradeable  {
    // using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    mapping(address => uint256) public balances;

    address public idleToken;
    address public underlyingAsset;
    uint256 public totalUnderlyingAssets;
    uint256 public maxValue = 2**256 - 1;

    /// @notice Emitted when the yield source is initialized
    event IdleYieldSourceInitialized(address indexed idleToken);

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

    /// @notice Emitted when ERC20 tokens other than yield source's aToken are withdrawn from the yield source
    event TransferredERC20(
        address indexed from,
        address indexed to,
        uint256 amount,
        IERC20Upgradeable indexed token
    );

    /// @notice Initializes the yield source with Idle Token
    /// @param _idleToken Idle Token address
    function initialize(
        address _idleToken
    ) public initializer {

        idleToken = _idleToken;
        underlyingAsset = IIdleToken(idleToken).token();

        IERC20Upgradeable(underlyingAsset).safeApprove(idleToken, 2**256 - 1);
        emit IdleYieldSourceInitialized(idleToken);
    }

    /// @notice Returns the ERC20 asset token used for deposits.
    /// @return The ERC20 asset token
    function depositToken() external view override returns (address) {
        return (underlyingAsset);
    }

    /// @notice Returns the total balance (in asset tokens).  This includes the deposits and interest.
    /// @return The underlying balance of asset tokens
    function balanceOfToken(address addr) external view override returns (uint256) {
        if (balances[addr] == 0) return 0;
        return _sharesToToken(balances[addr]);
    }

    /// @notice Calculates the balance of Total idle Tokens Contract hasv
    /// @return balance of Idle Tokens
    function _totalShare() internal view returns(uint256) {
        return IIdleToken(idleToken).balanceOf(address(this));
    }

    /// @notice Calculates the number of shares that should be mint or burned when a user deposit or withdraw
    /// @param tokens Amount of tokens
    /// @return Number of shares
    function _tokenToShares(uint256 tokens) internal view returns (uint256) {
        uint256 shares = 0;
        if(_totalShare() == 0) {
            shares = tokens;
        } else {
            shares = (tokens * _totalShare())  / totalUnderlyingAssets;
        }
        return shares;
    }

    /// @notice Calculates the number of tokens a user has in the yield source
    /// @param shares Amount of shares
    /// @return Number of tokens
    function _sharesToToken(uint256 shares) internal view returns (uint256) { 
        uint256 tokens = 0;
        if(_totalShare() == 0) {
            tokens = shares;
        } else {
            tokens = (shares * totalUnderlyingAssets) / _totalShare();
        }
        return tokens;
    }

    /// @notice Deposit asset tokens to Aave
    /// @param mintAmount The amount of asset tokens to be deposited
    /// @return 0 if successful 
    function _depositToIdle(uint256 mintAmount) internal returns (uint256) {
        IERC20Upgradeable(underlyingAsset).safeTransferFrom(msg.sender, address(this), mintAmount);
        uint256 mintedTokens = IIdleToken(idleToken).mintIdleToken(mintAmount, false, address(0));
        return mintedTokens;
    }

    /// @notice Allows assets to be supplied on other user's behalf using the `to` param.
    /// @param mintAmount The amount of `token()` to be supplied
    /// @param to The user whose balance will receive the tokens
    function supplyTokenTo(uint256 mintAmount, address to) public nonReentrant override {
        uint256 mintedTokens = _depositToIdle(mintAmount);
        balances[to] = balances[to] + mintedTokens;
        totalUnderlyingAssets = totalUnderlyingAssets + mintAmount;
        emit SuppliedTokenTo(msg.sender, mintedTokens, mintAmount, to);
    }

    /// @notice Redeems tokens from the yield source from the msg.sender, it burn yield bearing tokens and return token to the sender.
    /// @param redeemAmount The amount of `token()` to withdraw.  Denominated in `token()` as above.
    /// @return The actual amount of tokens that were redeemed.
    function redeemToken(uint256 redeemAmount) public override nonReentrant returns (uint256) {
        uint256 _idleShare = _tokenToShares(redeemAmount);
        require(balances[msg.sender] >= _idleShare, "RedeemToken: Not Enough Deposited");
        uint256 redeemedUnderlyingAsset = IIdleToken(idleToken).redeemIdleToken(_idleShare);
        balances[msg.sender] = balances[msg.sender] - _idleShare;
        totalUnderlyingAssets = totalUnderlyingAssets - redeemAmount;
        IERC20Upgradeable(underlyingAsset).safeTransfer(msg.sender, redeemedUnderlyingAsset);
        emit RedeemedToken(msg.sender, _idleShare, redeemAmount);
        return redeemedUnderlyingAsset;
    }

    /// @notice Allows someone to deposit into the yield source without receiving any shares
    /// @dev This allows anyone to distribute tokens among the share holders
    /// @param amount The amount of tokens to deposit
    function sponsor(uint256 amount) external override {
        _depositToIdle(amount);
        emit Sponsored(msg.sender, amount);
    }
}

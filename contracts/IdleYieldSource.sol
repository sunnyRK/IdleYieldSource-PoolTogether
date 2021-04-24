// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol"; 
import "./interfaces/pooltogether/IYieldSource.sol";
import "./interfaces/idle/IIdleToken.sol";
import "./interfaces/idle/IIdleTokenHelper.sol";
import "hardhat/console.sol";

/// @title An pooltogether yield source for Idle token
/// @author Sunny Radadiya
contract IdleYieldSource is IYieldSource, Initializable {
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    mapping(address => uint256) public balances;

    address public idleToken;
    address public underlyingAsset;
    address public iIdleTokenHelper;
    uint256 public totalUnderlyingAssets;

    event IdleYieldSourceInitialized(address indexed idleToken);

    constructor(address _idleToken, address _iIdleTokenHelper) {
        idleToken = _idleToken;
        underlyingAsset = IIdleToken(idleToken).token();
        iIdleTokenHelper = _iIdleTokenHelper;
    }

    function initialize(address _idleToken, address _iIdleTokenHelper) public initializer {
        idleToken = _idleToken;
        underlyingAsset = IIdleToken(idleToken).token();
        iIdleTokenHelper = _iIdleTokenHelper;

        emit IdleYieldSourceInitialized(idleToken);
    }

    /// @notice Returns the ERC20 asset token used for deposits.
    /// @return The ERC20 asset token
    function depositToken() public view override returns (address) {
        return (underlyingAsset);
    }

    /// @notice Returns the total balance (in asset tokens).  This includes the deposits and interest.
    /// @return The underlying balance of asset tokens
    function balanceOfToken(address addr) public view override returns (uint256) {
        if (balances[addr] == 0) return 0;
        uint256 redeemPrice = IIdleTokenHelper(iIdleTokenHelper).getRedeemPrice(idleToken);
        uint256 totalBalanceOfToken = balances[addr].mul(redeemPrice.div(1e18));
        return totalBalanceOfToken;
    }

    /// @notice Allows assets to be supplied on other user's behalf using the `to` param.
    /// @param amount The amount of `token()` to be supplied
    /// @param to The user whose balance will receive the tokens
    function supplyTokenTo(uint256 amount, address to) public override {
        IERC20Upgradeable(underlyingAsset).safeTransferFrom(msg.sender, address(this), amount);
        IERC20Upgradeable(underlyingAsset).safeApprove(idleToken, amount);
        uint256 mintedTokens = IIdleToken(idleToken).mintIdleToken(amount, false, address(0));
        balances[to] = balances[to].add(mintedTokens);
        totalUnderlyingAssets = totalUnderlyingAssets.add(amount);
    }

    /// @notice Redeems tokens from the yield source from the msg.sender, it burn yield bearing tokens and return token to the sender.
    /// @param amount The amount of `token()` to withdraw.  Denominated in `token()` as above.
    /// @return The actual amount of tokens that were redeemed.
    function redeemToken(uint256 amount) public override returns (uint256) {
        uint256 _idleShare = _sharesToToken(amount);
        require(balances[msg.sender] >= _idleShare, "RedeemToken:  Not Enough Deposited");
        uint256 redeemedUnderlyingAsset = IIdleToken(idleToken).redeemIdleToken(_idleShare);
        balances[msg.sender] = balances[msg.sender].sub(_idleShare);
        totalUnderlyingAssets = totalUnderlyingAssets.sub(amount);
        IERC20Upgradeable(underlyingAsset).safeTransfer(msg.sender, redeemedUnderlyingAsset);
        return redeemedUnderlyingAsset;
    }

    function getRedeemPrice() public view returns(uint256) {
        return IIdleTokenHelper(iIdleTokenHelper).getRedeemPrice(idleToken);
    }

    function totalDepositedAssets() public view returns(uint256) {
        return IIdleToken(idleToken).balanceOf(address(this));
    }

    function _sharesToToken(uint256 amount) public view returns(uint256) {
        return amount.mul(totalDepositedAssets()).div(totalUnderlyingAssets);
    }
}

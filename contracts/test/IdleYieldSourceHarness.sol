// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.4;

import "../IdleYieldSource.sol";

/* solium-disable security/no-block-members */
contract IdleYieldSourceHarness is IdleYieldSource {

  // using SafeMathUpgradeable for uint256;

  constructor(address _idleToken) IdleYieldSource() {
    idleToken = _idleToken;
    underlyingAsset = IIdleToken(idleToken).token();
  }

  function mint(address account, uint256 amount) public returns (bool) {
    balances[account] = balances[account] + amount;
    // supplyTokenTo(amount, account);
    return true;
  }

  function mintTotalUnderlyingAsset(uint256 amount) public returns (bool) {
    totalUnderlyingAssets = totalUnderlyingAssets + amount;
    // supplyTokenTo(amount, account);
    return true;
  }

  function totalShare() external view returns (uint256) {
      return _totalShare();
  }

  function tokenToShares(uint256 tokens) external view returns (uint256) {
      return _tokenToShares(tokens);
  }

  function sharesToToken(uint256 shares) external view returns (uint256) {
    return _sharesToToken(shares);
  }

  function totalUnderlyingAsset() external view returns (uint256) {
    return totalUnderlyingAssets;
  }
}

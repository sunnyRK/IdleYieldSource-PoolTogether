// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.4;

import "../IdleYieldSource.sol";

/* solium-disable security/no-block-members */
contract IdleYieldSourceHarness is IdleYieldSource {

  constructor(IIdleToken _idleToken) IdleYieldSource() {
    idleToken = _idleToken;
  }

  function mint(address account, uint256 amount) public returns (bool) {
    _mint(account, amount);
    return true;
  }

  function tokenAddress() external view returns (address) {
    return _tokenAddress();
  }

  function price() internal view returns (uint256) {
    return _price();
  }

  function tokenToShares(uint256 tokens) external view returns (uint256) {
    return _tokenToShares(tokens);
  }

  function sharesToToken(uint256 shares) external view returns (uint256) {
    return _sharesToToken(shares);
  }
}

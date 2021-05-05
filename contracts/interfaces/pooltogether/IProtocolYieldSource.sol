// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "./IYieldSource.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/// @title The interface used for all Yield Sources for the PoolTogether protocol
/// @dev There are two privileged roles: the owner and the asset manager.  The owner can configure the asset managers.
interface IProtocolYieldSource is IYieldSource {

  /// @notice Allows someone to deposit into the yield source without receiving any shares.  The deposited token will be the same as token()
  /// This allows anyone to distribute tokens among the share holders.
  function sponsor(uint256 amount) external;
}
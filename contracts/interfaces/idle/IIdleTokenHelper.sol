// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

interface IIdleTokenHelper {
    function getRedeemPrice(address idleYieldToken, address user) external view returns (uint256);
    function getRedeemPrice(address idleYieldToken) external view returns (uint256);
    function getMintingPrice(address idleYieldToken) external view returns (uint256);
}
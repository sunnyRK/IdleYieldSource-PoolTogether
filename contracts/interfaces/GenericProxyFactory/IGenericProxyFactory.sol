pragma solidity ^0.8.0;

interface IGenericProxyFactory {
  function create(address _instance, bytes calldata _data) external returns (address instanceCreated, bytes memory result);
}
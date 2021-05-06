// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IdleYieldSource.sol";
import "./interfaces/GenericProxyFactory/IGenericProxyFactory.sol";

contract IdleYieldSourceProxyFactory {
    
    IdleYieldSource public instance;
    IGenericProxyFactory public iGenericProxyFactory;

    constructor(
        address _iGenericProxyFactory
    ) {
        instance = new IdleYieldSource();
        iGenericProxyFactory = IGenericProxyFactory(_iGenericProxyFactory);
    }
    
    function createNewProxy() 
        public returns (address instanceCreated, bytes memory result) {
            (instanceCreated, result)= iGenericProxyFactory.create(
                address(instance),
                ''
                // abi.encodeWithSignature('initialize(address)', _idleToken)
            );
    }
}
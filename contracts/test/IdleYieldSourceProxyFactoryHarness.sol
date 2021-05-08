// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./IdleYieldSourceHarness.sol";
import "../interfaces/GenericProxyFactory/IGenericProxyFactory.sol";

contract IdleYieldSourceProxyFactoryHarness {
    
    IdleYieldSourceHarness public instance;
    IGenericProxyFactory public iGenericProxyFactory;

    constructor(
        address _idleToken,
        address _iGenericProxyFactory
    ) {
        instance = new IdleYieldSourceHarness(_idleToken);
        iGenericProxyFactory = IGenericProxyFactory(_iGenericProxyFactory);
    }
    
    function createNewProxy() 
        public returns (address instanceCreated, bytes memory result) {
            (instanceCreated, result)= iGenericProxyFactory.create(
                address(instance),
                ''
            );
    }
}
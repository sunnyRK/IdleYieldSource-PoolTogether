// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./IdleYieldSourceHarness.sol";
import "../interfaces/GenericProxyFactory/IGenericProxyFactory.sol";

contract IdleYieldSourceProxyFactoryHarness {
    
    IdleYieldSourceHarness public idleYieldSourceInstance;
    IGenericProxyFactory public iGenericProxyFactory;

    constructor(address _instance, address _iGenericProxyFactory) {
        idleYieldSourceInstance = IdleYieldSourceHarness(_instance);
        iGenericProxyFactory = IGenericProxyFactory(_iGenericProxyFactory);
    }
    
    function createNewProxy(address _idleToken) 
        public returns (address instanceCreated, bytes memory result) {
            (instanceCreated, result)= iGenericProxyFactory.create(
                address(idleYieldSourceInstance),
                ''
                // abi.encodeWithSignature('initialize(address)', _idleToken)
            );
    }
}
<p align="center">
  <a href="https://github.com/pooltogether/pooltogether--brand-assets">
    <img src="https://github.com/pooltogether/pooltogether--brand-assets/blob/977e03604c49c63314450b5d432fe57d34747c66/logo/pooltogether-logo--purple-gradient.png?raw=true" alt="PoolTogether Brand" style="max-width:100%;" width="200">
  </a>
</p>

<br />

# IdleYieldSource for PoolTOgethere Prize Pool

![Tests](https://github.com/pooltogether/aave-yield-source/actions/workflows/main.yml/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/sunnyRK/IdleYieldSource-PoolTogether/badge.svg?branch=master)](https://coveralls.io/github/sunnyRK/IdleYieldSource-PoolTogether?branch=master)
[![built-with openzeppelin](https://img.shields.io/badge/built%20with-OpenZeppelin-3677FF)](https://docs.openzeppelin.com/)  

PoolTogether Yield Source that uses [Idle](https://idle.finance/) to generate yield by lending ERC20 token supported by Idle and deposited into the Idle Yield Source.

## Setup

1). Make `.env` file on root folder and add below variable with your config,  

    i). MNEMONIC=""  
    ii). INFURA_API_KEY=""  
    iii). ALCHEMY_API_KEY=""  

2). Install Dependency by 
    
    yarn 
 
3). Test TestCases in commanline For Mainnet fork
        
    npx hardhat test

4). Test script for prizepool For Mainnet fork

    npx hardhat run .\scripts\idleYiledSourceScript.ts

5). Check test coverage

    npx hardhat coverage

4). Deploy New Idle Yield Source through Pooltogether-proxy-contract

    npx hardhat run .\deploy\deploy.ts --network kovan

    Output:

    PoolTogether Idle Yield Source - Deploy Script

    network: Kovan (remote)
    deployer: 0x2031d045f56e679925bFdCDa3416448Cc9B1b688
    deployer: 0x2031d045f56e679925bFdCDa3416448Cc9B1b688

    Deploying IdleYieldSourceProxyFactory...
    Deploying Proxy Yield Source...
    Deployed Yield Source...
    Initializing Yield Source
    Initialized!!
    Deployed New IdleYieldSource Address 0xecD4b75E7ccf571CF99B0F51955866657469bB49
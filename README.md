<p align="center">
  <a href="https://github.com/pooltogether/pooltogether--brand-assets">
    <img src="https://github.com/pooltogether/pooltogether--brand-assets/blob/977e03604c49c63314450b5d432fe57d34747c66/logo/pooltogether-logo--purple-gradient.png?raw=true" alt="PoolTogether Brand" style="max-width:100%;" width="200">
  </a>
</p>

<br />


# IdleYieldSource for PoolTOgethere Prize Pool

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

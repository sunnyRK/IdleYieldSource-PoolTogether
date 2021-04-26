import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import 'hardhat-abi-exporter';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
// import 'hardhat-gas-reporter';
require("solidity-coverage");

require('dotenv').config()

import { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
  mocha: {
    timeout: 30000000,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
        blockNumber: 12248197,
      }
    },

    // Mainnet
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      chainId: 1,
      accounts: {
        mnemonic: process.env.MNEMONIC,
        path: 'm/44\'/60\'/0\'/0',
        initialIndex: 1,
        count: 10,
      },
      gas: 'auto',
      gasPrice: 73000000000, // 1 gwei
      gasMultiplier: 1.5,
      timeout: 30000000
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${process.env.INFURA_API_KEY}`,
      chainId: 42,
      accounts: {
        mnemonic: process.env.MNEMONIC,
        path: 'm/44\'/60\'/0\'/0',
        initialIndex: 1,
        count: 10,
      },
      gas: 'auto',
      gasPrice: 73000000000, // 1 gwei
      gasMultiplier: 1.5,
      timeout: 30000000
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.5.16"
      },
      {
        version: "0.6.12"
      },
      {
        version: "0.7.0"
      },
      {
        version: "0.8.0"
      }
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: 'istanbul',
    },
  },
  typechain: {
    outDir: 'types',
    target: 'ethers-v5',
  },
};

export default config;

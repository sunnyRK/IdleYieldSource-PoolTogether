import chalk from 'chalk';

import { DeployResult } from 'hardhat-deploy/types';
import hre from "hardhat";

const displayLogs = !process.env.HIDE_DEPLOY_LOG;

function dim(logMessage: string) {
  if (displayLogs) {
    console.log(chalk.dim(logMessage));
  }
}

function cyan(logMessage: string) {
  if (displayLogs) {
    console.log(chalk.cyan(logMessage));
  }
}

function yellow(logMessage: string) {
  if (displayLogs) {
    console.log(chalk.yellow(logMessage));
  }
}

function green(logMessage: string) {
  if (displayLogs) {
    console.log(chalk.green(logMessage));
  }
}

function displayResult(name: string, result: DeployResult) {
  if (!result.newlyDeployed) {
    yellow(`Re-used existing ${name} at ${result.address}`);
  } else {
    green(`${name} deployed at ${result.address}`);
  }
}

const chainName = (chainId: number) => {
  switch (chainId) {
    case 1:
      return 'Mainnet';
    case 3:
      return 'Ropsten';
    case 4:
      return 'Rinkeby';
    case 5:
      return 'Goerli';
    case 42:
      return 'Kovan';
    case 77:
      return 'POA Sokol';
    case 99:
      return 'POA';
    case 100:
      return 'xDai';
    case 137:
      return 'Matic';
    case 31337:
      return 'HardhatEVM';
    case 80001:
      return 'Matic (Mumbai)';
    default:
      return 'Unknown';
  }
};

async function deployFunction() {
  const { getNamedAccounts, deployments, getChainId, ethers } = hre;
  const { deploy } = deployments;

  let { deployer, admin } = await getNamedAccounts();

  const chainId = parseInt(await getChainId());

  // 31337 is unit testing, 1337 is for coverage
  const isTestEnvironment = chainId === 31337 || chainId === 1337;

  const signer = ethers.provider.getSigner(deployer);

  dim('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  dim('PoolTogether Idle Yield Source - Deploy Script');
  dim('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  dim(`network: ${chainName(chainId)} (${isTestEnvironment ? 'local' : 'remote'})`);
  dim(`deployer: ${deployer}`);

  if (!admin) {
    admin = signer._address;
  }

  dim(`deployer: ${admin}`);

  cyan(`\nDeploying IdleYieldSourceProxyFactory...`);

  let idleDai;
  let genericProxyFactory;

  if (chainName(chainId) == 'Kovan') {
    // Kovan
    idleDai = '0x295CA5bC5153698162dDbcE5dF50E436a58BA21e';
    genericProxyFactory = '0x713edC7728C4F0BCc135D48fF96282444d77E604';

  } else { 
    // Mainnet
    idleDai = '0x3fE7940616e5Bc47b0775a0dccf6237893353bB4';
    genericProxyFactory = '0x594069c560D260F90C21Be25fD2C8684efbb5628';
  
  }

  let genericProxyFactory_instance = await ethers.getContractAt(
    'GenericProxyFactory',
    genericProxyFactory,
    signer,
  )

  const idleYieldSourceProxyFactoryResult = await ethers.getContractFactory('IdleYieldSourceProxyFactory');
  const idleYieldSourceProxyFactoryResult_instance = await idleYieldSourceProxyFactoryResult.deploy(genericProxyFactory)

  console.log("Deploying Proxy Yield Source...");

  let createProxyTx = await idleYieldSourceProxyFactoryResult_instance.createNewProxy()
  const receipt = await ethers.provider.getTransactionReceipt(createProxyTx.hash);

  const proxyCreatedEvent = genericProxyFactory_instance.interface.parseLog(
    receipt.logs[0],
  );

  const proxyIdleYieldSource = await ethers.getContractAt(
    'IdleYieldSource',
    proxyCreatedEvent.args[0],
    signer,
  );
  console.log("Deployed Yield Source...");

  console.log("Initializing Yield Source");
  await proxyIdleYieldSource.initialize(idleDai);
  console.log("Initialized!!");

  console.log('Deployed New IdleYieldSource Address', proxyIdleYieldSource.address)
};

deployFunction()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });


// const { expect } = require("chai");
// const { BigNumber, Wallet } = require("ethers");
// const { formatEther, parseEther } =require('@ethersproject/units')
// const daiAbi = require('../abis/daiAbi.json');
// const IIdleTokenAbi = require('../abis/IIdleToken.json');
// const IIdleTokenHelperAbi = require('../abis/IIdleTokenHelper.json');
// const hre = require("hardhat");
// const debug = require('debug');
// const toWei = hre.ethers.utils.parseEther;

// describe('IdleYieldSource', () => {

//     let accounts: any
//     let genericProxyFactoryContract: any
//     let hardhatGenericProxyFactory: any
//     let daiContract: any
//     let accountToImpersonate: any
//     let daiAddress: any
//     let idleToken: any
//     let iIdleTokenHelper: any
//     let signer: any
//     let impersonateBalanceBefore: any
//     let ourAccountBalanceBefore: any
//     let ourAccountBalanceAfter: any
//     let IdleYieldSource: any
//     let IdleYieldSource_Instance: any
//     let IdleYieldSource_ABI: any
//     let IdleYieldSource_Instance_Proxy_Instance: any
//     let maxValue: any
//     let idleTokenHelperContract: any

//     beforeEach(async () => {
//         debug('mocking tokens...');

//         maxValue = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
//         accounts = await hre.ethers.getSigners();

//         // Mainnet addresses
//         accountToImpersonate = '0xF977814e90dA44bFA03b6295A0616a897441aceC'
//         daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
//         idleToken = '0x3fE7940616e5Bc47b0775a0dccf6237893353bB4'
//         iIdleTokenHelper = '0x04Ce60ed10F6D2CfF3AA015fc7b950D13c113be5'

//         await hre.network.provider.request({
//             method: "hardhat_impersonateAccount",
//             params: [accountToImpersonate]
//         })
//         signer = await hre.ethers.provider.getSigner(accountToImpersonate)

//         daiContract = new hre.ethers.Contract(daiAddress, daiAbi, signer)
//         impersonateBalanceBefore = await daiContract.balanceOf(accountToImpersonate)
//         ourAccountBalanceBefore = await daiContract.balanceOf(accounts[0].address)
//         await daiContract.transfer(accounts[0].address,  hre.ethers.utils.parseUnits('1000', 18))
//         signer = await hre.ethers.provider.getSigner(accounts[0].address)
//         daiContract = new hre.ethers.Contract(daiAddress, daiAbi, signer)

//         ourAccountBalanceAfter = await daiContract.balanceOf(accounts[0].address)
        
//         genericProxyFactoryContract = await hre.ethers.getContractFactory('GenericProxyFactory');
//         hardhatGenericProxyFactory = await genericProxyFactoryContract.deploy()
//         IdleYieldSource_ABI = (await hre.artifacts.readArtifact("IdleYieldSource")).abi

//         IdleYieldSource = await hre.ethers.getContractFactory('IdleYieldSource', signer);
//         IdleYieldSource_Instance = await IdleYieldSource.deploy(idleToken, iIdleTokenHelper);
//         idleTokenHelperContract = new hre.ethers.Contract(iIdleTokenHelper, IIdleTokenHelperAbi, signer)
//     });

//     describe('Check Balance()', () => {
//         it("hardhat_impersonateAccount and check transfered balance to our account", async function() {
//             expect(ourAccountBalanceBefore).to.equal(0)
//             expect(ourAccountBalanceAfter).to.equal(hre.ethers.utils.parseUnits('1000', 18))
//         });
//     });

//     describe('create()', () => {
//         it('should create IdleYieldSource', async () => {
//           expect(await aTokenYieldSource.aToken()).to.equal(aToken.address);
//           expect(await aTokenYieldSource.lendingPoolAddressesProviderRegistry()).to.equal(
//             lendingPoolAddressesProviderRegistry.address,
//           );
//           expect(await aTokenYieldSource.owner()).to.equal(yieldSourceOwner.address);
//         });
//       });
// });

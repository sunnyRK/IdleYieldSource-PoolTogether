
const { expect } = require("chai");
const { BigNumber, Wallet } = require("ethers");
const { formatEther, parseEther } =require('@ethersproject/units')
const daiAbi = require('../abis/daiAbi.json');
const IIdleTokenAbi = require('../abis/IIdleToken.json');
const IIdleTokenHelperAbi = require('../abis/IIdleTokenHelper.json');
const hre = require("hardhat");

// // Mainnet Fork and test case for mainnet with hardhat network by impersonate account from mainnet
describe("deployed Contract on Mainnet fork", function() {
    let accounts: any
    let genericProxyFactoryContract: any
    let hardhatGenericProxyFactory: any
    let daiContract: any
    let accountToImpersonate: any
    let daiAddress: any
    let idleToken: any
    let iIdleTokenHelper: any
    let signer: any
    let impersonateBalanceBefore: any
    let ourAccountBalanceBefore: any
    let ourAccountBalanceAfter: any
    let IdleYieldSource: any
    let IdleYieldSource_Instance: any
    let IdleYieldSource_ABI: any
    let IdleYieldSource_Instance_Proxy_Instance: any
    let maxValue: any
    let idleTokenHelperContract: any

    describe('create functions', () => {
        before(async () => {
            maxValue = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
            accounts = await hre.ethers.getSigners();

            // Mainnet addresses
            accountToImpersonate = '0xF977814e90dA44bFA03b6295A0616a897441aceC'
            daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
            idleToken = '0x3fE7940616e5Bc47b0775a0dccf6237893353bB4'
            iIdleTokenHelper = '0x04Ce60ed10F6D2CfF3AA015fc7b950D13c113be5'

            await hre.network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [accountToImpersonate]
            })
            signer = await hre.ethers.provider.getSigner(accountToImpersonate)

            daiContract = new hre.ethers.Contract(daiAddress, daiAbi, signer)
            impersonateBalanceBefore = await daiContract.balanceOf(accountToImpersonate)
            ourAccountBalanceBefore = await daiContract.balanceOf(accounts[0].address)
            await daiContract.transfer(accounts[0].address,  hre.ethers.utils.parseUnits('1000', 18))
            signer = await hre.ethers.provider.getSigner(accounts[0].address)
            daiContract = new hre.ethers.Contract(daiAddress, daiAbi, signer)

            ourAccountBalanceAfter = await daiContract.balanceOf(accounts[0].address)
            
            genericProxyFactoryContract = await hre.ethers.getContractFactory('GenericProxyFactory');
            hardhatGenericProxyFactory = await genericProxyFactoryContract.deploy()
            IdleYieldSource_ABI = (await hre.artifacts.readArtifact("IdleYieldSource")).abi

            IdleYieldSource = await hre.ethers.getContractFactory('IdleYieldSource', signer);
            IdleYieldSource_Instance = await IdleYieldSource.deploy(idleToken, iIdleTokenHelper);
            idleTokenHelperContract = new hre.ethers.Contract(iIdleTokenHelper, IIdleTokenHelperAbi, signer)
        })
        
        it("hardhat_impersonateAccount and check transfered balance to our account", async function() {
            expect(ourAccountBalanceBefore).to.equal(0)
            expect(ourAccountBalanceAfter).to.equal(hre.ethers.utils.parseUnits('1000', 18))
        });

        it("Deploy first instance of Idle Yield Source", async function() {
            const _idleToken = await IdleYieldSource_Instance.idleToken()
            const _iIdleTokenHelper = await IdleYieldSource_Instance.iIdleTokenHelper()
            const _underlyingAsset = await IdleYieldSource_Instance.underlyingAsset()
            const _depositToken = await IdleYieldSource_Instance.depositToken()

            expect(_idleToken).to.equal(idleToken)
            expect(_iIdleTokenHelper).to.equal(iIdleTokenHelper)
            expect(_underlyingAsset).to.equal(daiAddress)
            expect(_depositToken).to.equal(daiAddress)
        });

        it("Create Multiple instance using GenericProxyFactory", async function() {
            let IdleYieldSourceInterface = new hre.ethers.utils.Interface((await hre.artifacts.readArtifact("IdleYieldSource")).abi)   
            let bytesOfInterface = IdleYieldSourceInterface.encodeFunctionData(
                                    IdleYieldSourceInterface.getFunction("initialize(address,address)"), 
                                    [idleToken, iIdleTokenHelper]
                                )

            let newInstanceOfYieldSource = await hardhatGenericProxyFactory.create(IdleYieldSource_Instance.address, bytesOfInterface)

            const receipt = await hre.ethers.provider.getTransactionReceipt(newInstanceOfYieldSource.hash);
            const createdEvent = hardhatGenericProxyFactory.interface.parseLog(receipt.logs[0]);
            expect(createdEvent.name).to.equal('ProxyCreated');
            
            IdleYieldSource_Instance_Proxy_Instance = new hre.ethers.Contract(createdEvent.args[0], IdleYieldSource_ABI, signer)

            const _idleToken = await IdleYieldSource_Instance_Proxy_Instance.idleToken()
            const _iIdleTokenHelper = await IdleYieldSource_Instance_Proxy_Instance.iIdleTokenHelper()
            const _underlyingAsset = await IdleYieldSource_Instance_Proxy_Instance.underlyingAsset()
            const _depositToken = await IdleYieldSource_Instance_Proxy_Instance.depositToken()

            expect(_idleToken).to.equal(idleToken)
            expect(_iIdleTokenHelper).to.equal(iIdleTokenHelper)
            expect(_underlyingAsset).to.equal(daiAddress)
            expect(_depositToken).to.equal(daiAddress)
        });

        it("Supply DAI Token to idle yield source", async function() {

            const daiBalanceBefore = await daiContract.balanceOf(accounts[0].address)
            const idleDaiBalanceBefore = await IdleYieldSource_Instance_Proxy_Instance.balanceOfToken(accounts[0].address)
            console.log('Before: ', daiBalanceBefore.toString(), idleDaiBalanceBefore.toString())

            await daiContract.approve(
                IdleYieldSource_Instance_Proxy_Instance.address, 
                maxValue
            )
            await IdleYieldSource_Instance_Proxy_Instance.supplyTokenTo(
              daiBalanceBefore.toString(),
              accounts[0].address
            )

            const daiBalanceAfter = await daiContract.balanceOf(accounts[0].address)
            const idleDaiBalanceAfter = await IdleYieldSource_Instance_Proxy_Instance.balanceOfToken(accounts[0].address)
            console.log('After: ', daiBalanceAfter.toString(), idleDaiBalanceAfter.toString())
            
            expect(daiBalanceBefore).to.equal(hre.ethers.utils.parseUnits('1000', 18))
            expect(daiBalanceAfter).to.equal(0)
            expect(idleDaiBalanceBefore).to.equal(0)
            expect(new BigNumber.from(idleDaiBalanceAfter)).to.be.gt(new BigNumber.from(0))
        });

        it("Withdraw DAI Token from idle yield source", async function() {

            const daiBalanceBefore = await daiContract.balanceOf(accounts[0].address)
            const idleDaiBalanceBefore = await IdleYieldSource_Instance_Proxy_Instance.balanceOfToken(accounts[0].address)
            console.log('Before: ', daiBalanceBefore.toString(), idleDaiBalanceBefore.toString())

            await hre.ethers.provider.send("evm_setNextBlockTimestamp", [1623067600]) // Monday, 7 June 2021 12:06:40
            await hre.ethers.provider.send("evm_mine")

            await IdleYieldSource_Instance_Proxy_Instance.redeemToken(
              hre.ethers.utils.parseUnits('1000', 18).toString() // in pooltogether case, it will ticket balance here
            )
            
            const daiBalanceAfter = await daiContract.balanceOf(accounts[0].address)
            const idleDaiBalanceAfter = await IdleYieldSource_Instance_Proxy_Instance.balanceOfToken(accounts[0].address)
            console.log('After: ', daiBalanceAfter.toString(), idleDaiBalanceAfter.toString())
            
            expect(daiBalanceBefore).to.equal(0)
            expect(new BigNumber.from(daiBalanceAfter)).to.be.gt(new BigNumber.from(hre.ethers.utils.parseUnits('1000', 18)))
            expect(new BigNumber.from(idleDaiBalanceBefore)).to.be.gt(new BigNumber.from(0))
            expect(idleDaiBalanceAfter).to.equal(0)
        });
    });
})

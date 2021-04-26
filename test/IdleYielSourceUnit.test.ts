
const { expect } = require("chai");
const { BigNumber, Wallet } = require("ethers");
const { formatEther, parseEther } = require('@ethersproject/units')
const Signer = require('@ethersproject/abstract-signer');
const { JsonRpcProvider } = require('@ethersproject/providers');
const { SignerWithAddress } = require('@nomiclabs/hardhat-ethers/signers');
const daiAbi = require('../abis/daiAbi.json');
const IIdleTokenAbi = require('../abis/IIdleToken.json');
const IIdleTokenHelperAbi = require('../abis/IIdleTokenHelper.json');
const hre = require("hardhat");
const {waffle} = require("hardhat");
const debug = require('debug');
const toWei = hre.ethers.utils.parseEther;
const IERC20 = require('../artifacts/@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol/IERC20Upgradeable.json');
import {
    IdleYieldSourceHarness, 
    IIdleToken as IIdleTokenCont,
    IERC20Upgradeable as ERC20,
    IIdleToken
  } from '../types';

describe('IdleYieldSource', () => {

    let contractsOwner: any;
    let yieldSourceOwner: any;
    let wallet2: any;
    let provider: any;

    let accounts: any
    let genericProxyFactoryContract: any
    let hardhatGenericProxyFactory: any
    let daiContract: any
    let accountToImpersonate: any
    let daiAddress: any
    let idleToken: any
    let signer: any
    let impersonateBalanceBefore: any
    let ourAccountBalanceBefore: any
    let ourAccountBalanceAfter: any
    let IdleYieldSource: any
    let IdleYieldSource_Instance: any
    let IdleYieldSource_ABI: any
    let IdleYieldSource_Instance_Proxy_Instance: any
    let maxValue: any
    let idleYieldSource: IdleYieldSourceHarness;
    let idleTokenContract: IIdleTokenCont
    let erc20Token: any;

    beforeEach(async () => {
        
        const { deployMockContract } = waffle;

        [contractsOwner, yieldSourceOwner, wallet2] = await hre.ethers.getSigners();
        provider = waffle.provider;

        debug('mocking tokens...');

        maxValue = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
        accounts = await hre.ethers.getSigners();

        // Mainnet addresses
        accountToImpersonate = '0xF977814e90dA44bFA03b6295A0616a897441aceC'
        daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
        idleToken = '0x3fE7940616e5Bc47b0775a0dccf6237893353bB4'

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [accountToImpersonate]
        })
        signer = await hre.ethers.provider.getSigner(accountToImpersonate)

        daiContract = new hre.ethers.Contract(daiAddress, daiAbi, signer)
        impersonateBalanceBefore = await daiContract.balanceOf(accountToImpersonate)
        ourAccountBalanceBefore = await daiContract.balanceOf(yieldSourceOwner.address)
        await daiContract.transfer(accounts[0].address,  daiContract.balanceOf(accountToImpersonate))
        // await daiContract.transfer(accounts[1].address,  hre.ethers.utils.parseUnits('1000', 18))
        
        signer = await hre.ethers.provider.getSigner(accounts[0].address)
        daiContract = new hre.ethers.Contract(daiAddress, daiAbi, signer)

        ourAccountBalanceAfter = await daiContract.balanceOf(accounts[0].address)
        
        genericProxyFactoryContract = await hre.ethers.getContractFactory('GenericProxyFactory');
        hardhatGenericProxyFactory = await genericProxyFactoryContract.deploy()
        IdleYieldSource_ABI = (await hre.artifacts.readArtifact("IdleYieldSource")).abi

        const IdleYieldSource = await hre.ethers.getContractFactory(
            'IdleYieldSourceHarness',
          );
        const hardhatIdleYieldSourceHarness = await IdleYieldSource.deploy(idleToken)
    
        idleYieldSource = (await hre.ethers.getContractAt(
            'IdleYieldSourceHarness',
            hardhatIdleYieldSourceHarness.address,
            accounts[0].address,
        )) as IdleYieldSourceHarness;

        erc20Token = await deployMockContract(contractsOwner, IERC20.abi);
    });

    describe('create()', () => {
        it('should create IdleYieldSource', async () => {
            const _idleToken = await idleYieldSource.idleToken()
            const _underlyingAsset = await idleYieldSource.underlyingAsset()
            const _depositToken = await idleYieldSource.depositToken()

            expect(_idleToken).to.equal(idleToken)
            expect(_underlyingAsset).to.equal(daiAddress)
            expect(_depositToken).to.equal(daiAddress)
        });
    });

    describe('depositToken()', () => {
        it('should return the underlying token', async () => {
          expect(await idleYieldSource.depositToken()).to.equal(daiAddress);
        });
    });

    describe('balanceOfToken()', () => {
        it('should return user balance', async () => {
            await daiContract.approve(idleYieldSource.address, maxValue)
            await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
            const balanceOfToken = await idleYieldSource.callStatic.balanceOfToken(yieldSourceOwner.address)   
            expect(parseInt(formatEther(balanceOfToken.toString())).toString()).to.equal('100');
        });
    });

    describe('totalShare()', () => {
        let transferAmount: any
        let idleContract: any
        beforeEach(async () => {
            transferAmount = toWei('10');
            await daiContract.approve(idleYieldSource.address, maxValue);
            idleContract = new hre.ethers.Contract(idleToken, daiAbi, signer)
        });
        it('should return user balance', async () => {
            await daiContract.approve(idleYieldSource.address, maxValue)
            await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
            const totalShare = await idleYieldSource.totalShare()  
            const totalShareBalance = await idleContract.balanceOf(idleYieldSource.address); 
            expect(totalShare).to.equal(totalShareBalance);
        });
    });

    describe('_tokenToShares()', () => {
        it('should return shares amount', async () => {
            await daiContract.approve(idleYieldSource.address, maxValue)
            await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
            const tokenToShares = await idleYieldSource.tokenToShares(toWei('10'));
            expect(parseInt(formatEther(tokenToShares.toString())).toString()).to.equal('9');
        });
    
        it('should return 0 if tokens param is 0', async () => {
            expect(await idleYieldSource.tokenToShares("0")).to.equal("0");
        });
    
        it('should return tokens if totalSupply is 0', async () => {
            expect(await idleYieldSource.tokenToShares(toWei('100'))).to.equal(toWei('100'));
        });
    
        it('should return shares even if aToken total supply has a lot of decimals', async () => {
            await daiContract.approve(idleYieldSource.address, maxValue)
            await idleYieldSource.mint(yieldSourceOwner.address, toWei('0.000000000000000005'));
            expect(await idleYieldSource.tokenToShares(toWei('0.000000000000000005'))).to.equal('4');
        });
    
        it('should return shares even if aToken total supply increases', async () => {
            await daiContract.approve(idleYieldSource.address, maxValue)
            await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
            expect(parseInt(formatEther((await idleYieldSource.tokenToShares(toWei('10'))).toString())).toString()).to.equal('9');
            await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
            expect(parseInt(formatEther((await idleYieldSource.tokenToShares(toWei('10'))).toString())).toString()).to.equal('9');
        });
    
        // it('should fail to return shares if idle Token total supply increases too much', async () => { // failing here
        //     await daiContract.approve(idleYieldSource.address, maxValue)
        //     await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
        //     expect(parseInt(formatEther((await idleYieldSource.tokenToShares(toWei('10'))).toString())).toString()).to.equal('9');
        //     await idleYieldSource.mint(yieldSourceOwner.address, hre.ethers.utils.parseUnits('10', 24));

        //     // const bal = await idleYieldSource.tokenToShares(toWei('1'))
        //     // console.log(bal.toString());

        //     // await idleYieldSource.supplyTokenTo(toWei('1'), yieldSourceOwner.address);

        //     // expect(parseInt(formatEther((await idleYieldSource.tokenToShares(toWei('1'))).toString())))
        //     //     .to.be.revertedWith('IdleYieldSource/shares-equal-zero');

        //     console.log('hhh',parseInt(formatEther((await idleYieldSource.tokenToShares(toWei('1'))).toString())).toString())

        //     expect(parseInt(formatEther((await idleYieldSource.tokenToShares(toWei('1'))).toString())).toString()).to.equal('4');
        // });
      });

      describe('_sharesToToken()', () => {
        it('should return tokens amount', async () => {
            await daiContract.approve(idleYieldSource.address, maxValue)
            await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
            await idleYieldSource.mint(wallet2.address, toWei('100'));    
            // const bal = await idleYieldSource.sharesToToken(toWei('100'))
            // console.log('bal: ', bal.toString())
            expect(parseInt(formatEther((await idleYieldSource.sharesToToken(toWei('2'))).toString())).toString()).to.equal('2');
        });
    
        it('should return shares if totalSupply is 0', async () => {
            expect(await idleYieldSource.sharesToToken(toWei('100'))).to.equal(toWei('100'));
        });
    
        it('should return tokens even if totalSupply has a lot of decimals', async () => {
            await daiContract.approve(idleYieldSource.address, maxValue)
            await idleYieldSource.mint(yieldSourceOwner.address, toWei('0.000000000000000005')); 
            const bal = await idleYieldSource.sharesToToken(toWei('0.000000000000000005'))
            // console.log('bal: ', bal.toString())       
            expect((await idleYieldSource.sharesToToken(toWei('0.000000000000000005')))).to.equal('6');
        });
    
        it('should return tokens even if aToken total supply increases', async () => {
            await daiContract.approve(idleYieldSource.address, maxValue);
            await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
            await idleYieldSource.mint(wallet2.address, toWei('100'));
            const bal = await idleYieldSource.sharesToToken(toWei('2'));
            // console.log('bal2: ', parseInt(formatEther(bal)).toString(), toWei('2').toString());
            expect(parseInt(formatEther(await idleYieldSource.sharesToToken(toWei('2')))).toString()).to.equal('2');
        });
      });

      describe('supplyTokenTo()', () => {
        let amount: any;
        let tokenAddress: any;
    
        beforeEach(async () => {
          amount = toWei('100');
          await daiContract.approve(idleYieldSource.address, maxValue);
        });
    
        it('should supply assets if totalSupply is 0', async () => {
          await idleYieldSource.supplyTokenTo(amount, yieldSourceOwner.address);
          expect(await idleYieldSource.totalUnderlyingAssets()).to.equal(amount);
        });
    
        it('should supply assets if totalSupply is not 0', async () => {
            await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
            await idleYieldSource.mint(wallet2.address, toWei('100'));
            await idleYieldSource.supplyTokenTo(amount, yieldSourceOwner.address);
        });
    
        // it('should revert on error', async () => {
        //   await underlyingToken.mock.approve.withArgs(lendingPoolAddress, amount).returns(true);
        //   await lendingPool.mock.deposit
        //     .withArgs(tokenAddress, amount, aTokenYieldSource.address, 188)
        //     .reverts();
    
        //   await expect(
        //     aTokenYieldSource.supplyTokenTo(amount, aTokenYieldSource.address),
        //   ).to.be.revertedWith('');
        // });
      });
    

      describe('redeemToken()', () => {
        let yieldSourceOwnerBalance: any;
        let redeemAmount: any;
    
        beforeEach(async () => {
            yieldSourceOwnerBalance = toWei('300');
            redeemAmount = toWei('100');
            await daiContract.approve(idleYieldSource.address, maxValue);
        });
    
        it('should redeem assets', async () => {
            await idleYieldSource.mint(yieldSourceOwner.address, yieldSourceOwnerBalance);
            await idleYieldSource.supplyTokenTo(toWei('100'), yieldSourceOwner.address);
            await idleYieldSource.connect(yieldSourceOwner).redeemToken(redeemAmount);
        });
    
        it('should not be able to redeem assets if balance is 0', async () => {
            await expect(
                idleYieldSource.connect(yieldSourceOwner).redeemToken(redeemAmount),
            ).to.be.revertedWith('RedeemToken:  Not Enough Deposited');
        });
    
        it('should fail to redeem if amount superior to balance', async () => {
            await idleYieldSource.supplyTokenTo(toWei('50'), yieldSourceOwner.address);
            await expect(
                idleYieldSource.connect(yieldSourceOwner).redeemToken(redeemAmount),
            ).to.be.revertedWith('RedeemToken:  Not Enough Deposited');
        });
    });

    describe('transferERC20()', () => {
        let idleContract: any
        let transferAmount: any
        beforeEach(async () => {
            transferAmount = toWei('10');
            await daiContract.approve(idleYieldSource.address, maxValue);
            idleContract = new hre.ethers.Contract(idleToken, daiAbi, signer)
        });

        it('should transferERC20 if yieldSourceOwner', async () => {
            await daiContract.transfer(idleYieldSource.address, transferAmount)
            await idleYieldSource.transferERC20(daiContract.address, wallet2.address, transferAmount);
        });
    
        it('should transferERC20 if assetManager', async () => {    
          await daiContract.transfer(idleYieldSource.address, transferAmount)
          await idleYieldSource.setAssetManager(wallet2.address);
          await idleYieldSource
            .connect(wallet2)
            .transferERC20(daiContract.address, yieldSourceOwner.address, transferAmount);
        });
    
        it('should not allow to transfer aToken', async () => {
          await expect(
            idleYieldSource
              .transferERC20(idleContract.address, wallet2.address, transferAmount))
            .to.be.revertedWith('IdleTokenYieldSource/idleToken-transfer-not-allowed');
        });
    
        it('should fail to transferERC20 if not yieldSourceOwner or assetManager', async () => {
            await daiContract.transfer(idleYieldSource.address, transferAmount)
            await expect(
                idleYieldSource
                .connect(wallet2)
                .transferERC20(daiContract.address, yieldSourceOwner.address, transferAmount),
            ).to.be.revertedWith('OwnerOrAssetManager: caller is not owner or asset manager');
        });
      });
    
      describe('sponsor()', () => {
        let amount: any;
    
        beforeEach(async () => {
            amount = toWei('500');
            await daiContract.approve(idleYieldSource.address, maxValue);
        });
    
        it('should sponsor Yield Source', async () => {
            await idleYieldSource.sponsor(amount);
        });
    });
});

import {
	expect
} from 'chai';
import {
	deployMockContract
} from 'ethereum-waffle';
const {
	formatEther
} = require('@ethersproject/units')
import {
	ethers,
	waffle
} from 'hardhat';
import {
	BigNumber
} from '@ethersproject/bignumber';
import {
	JsonRpcProvider
} from '@ethersproject/providers';
import {
	SignerWithAddress
} from '@nomiclabs/hardhat-ethers/signers';
import IIdleTokenABI from "../artifacts/contracts/interfaces/idle/IIdleToken.sol/IIdleToken.json";
import SafeERC20WrapperUpgradeable from '../artifacts/contracts/test/SafeERC20WrapperUpgradeable.sol/SafeERC20WrapperUpgradeable.json';

import {
	IdleYieldSourceHarness,
	IERC20Upgradeable as ERC20,
	IIdleToken,
	IdleYieldSourceProxyFactoryHarness,
} from '../types';
const toWei = ethers.utils.parseEther;

describe('GenericProxyFactory', () => {

	let contractsOwner: SignerWithAddress;
	let yieldSourceOwner: SignerWithAddress;
	let wallet2: SignerWithAddress;
	let provider: JsonRpcProvider;
	let idleYieldSource: any;
	let erc20Token: ERC20;
	let underlyingToken: any;
	let idletoken: any;
	let maxValue: any

	beforeEach(async() => {
		[contractsOwner, yieldSourceOwner, wallet2] = await ethers.getSigners();
		maxValue = "115792089237316195423570985008687907853269984665640564039457584007913129639935"
        provider = waffle.provider;

		erc20Token = ((await deployMockContract(
			contractsOwner,
			SafeERC20WrapperUpgradeable.abi,
		)) as unknown) as ERC20;

		underlyingToken = ((await deployMockContract(
			contractsOwner,
			SafeERC20WrapperUpgradeable.abi,
		)) as unknown) as ERC20;

		idletoken = ((await deployMockContract(contractsOwner, IIdleTokenABI.abi)) as unknown) as IIdleToken;
		await idletoken.mock.token.returns(underlyingToken.address);

		const genericProxyFactoryContract = await ethers.getContractFactory('GenericProxyFactory');
		const hardhatGenericProxyFactory = await genericProxyFactoryContract.deploy();

		const idleYieldSourceProxyFactory = await ethers.getContractFactory(
			'IdleYieldSourceProxyFactoryHarness'
		);
		const hardhatIdleYieldSourceProxyFactory = (await idleYieldSourceProxyFactory.deploy(
				idletoken.address,
				hardhatGenericProxyFactory.address
			) as unknown) as IdleYieldSourceProxyFactoryHarness;

		const initializeTx = await hardhatIdleYieldSourceProxyFactory.createNewProxy();
		const receipt = await provider.getTransactionReceipt(initializeTx.hash);
		const proxyCreatedEvent = hardhatGenericProxyFactory.interface.parseLog(
			receipt.logs[0],
		);
		expect(proxyCreatedEvent.name).to.equal('ProxyCreated');

		idleYieldSource = (await ethers.getContractAt(
			'IdleYieldSourceHarness',
			proxyCreatedEvent.args[0],
			contractsOwner,
		) as unknown) as IdleYieldSourceHarness;
	  	
		await underlyingToken.mock.allowance
			.withArgs(idleYieldSource.address, idletoken.address)
			.returns(toWei('0'));
		await underlyingToken.mock.approve.withArgs(idletoken.address, maxValue).returns(true);
		await idleYieldSource.initialize(idletoken.address);
	});

	describe('create()', () => {
		it('should create IdleYieldSource', async() => {
			const _idleToken = await idleYieldSource.idleToken();
			const _underlyingAsset = await idleYieldSource.underlyingAsset();
			const _depositToken = await idleYieldSource.depositToken();
			expect(_idleToken).to.equal(idletoken.address);
			expect(_underlyingAsset).to.equal(underlyingToken.address);
			expect(_depositToken).to.equal(underlyingToken.address);
		});
	});

	describe('depositToken()', () => {
		it('should return the underlying token', async() => {
			expect(await idleYieldSource.depositToken()).to.equal(underlyingToken.address);
		});
	});

	describe('balanceOfToken()', () => {
		it('should return user balance', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mint(wallet2.address, toWei('100'));
			await idletoken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));
			expect(await idleYieldSource.balanceOfToken(wallet2.address)).to.equal(toWei('100'));
		});
	});

	describe('_tokenToShares()', () => {
		it('should return shares amount', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mint(wallet2.address, toWei('100'));
			await idletoken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));
			const tokenToShares = await idleYieldSource.tokenToShares(toWei('20'));
			expect(parseInt(formatEther(tokenToShares.toString())).toString()).to.equal('20');
		});

		it('should return 0 if tokens param is 0', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mint(wallet2.address, toWei('100'));
			await idletoken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));
			expect(await idleYieldSource.tokenToShares(toWei('0'))).to.equal(toWei('0'));
		});

		it('should return tokens if totalSupply is 0', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('0'));
			await idleYieldSource.mint(wallet2.address, toWei('0'));
			await idletoken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));
			expect(await idleYieldSource.tokenToShares(toWei('100'))).to.equal(toWei('100'));
		});

		it('should return shares even if idleToken total supply has a lot of decimals', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('0.000000000000000005'));
			await idleYieldSource.mint(wallet2.address, toWei('0.000000000000000005'));
			await idletoken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));
			expect(await idleYieldSource.tokenToShares(toWei('0.000000000000000005'))).to.equal(toWei('0.000000000000000005'));
		});

		it('should return shares even if idleToken total supply increases', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idletoken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));
			expect(await idleYieldSource.tokenToShares(toWei('10'))).to.equal(toWei('10'));
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idletoken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));
			expect(await idleYieldSource.tokenToShares(toWei('10'))).to.equal(toWei('10'));
		});
	});

	describe('_sharesToToken()', () => {
		it('should return tokens amount', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mint(wallet2.address, toWei('100'));
			await idletoken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));
			expect(await idleYieldSource.sharesToToken(toWei('20'))).to.equal(toWei('20'));
		});

		it('should return shares if totalSupply is 0', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('0'));
			await idleYieldSource.mint(wallet2.address, toWei('0'));
			await idletoken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));
			expect(await idleYieldSource.sharesToToken(toWei('100'))).to.equal(toWei('100'));
		});

		it('should return tokens even if totalSupply has a lot of decimals', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('0.000000000000000005'));
			await idleYieldSource.mint(wallet2.address, toWei('0.000000000000000005'));
			await idletoken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));
			expect(await idleYieldSource.sharesToToken(toWei('0.000000000000000005'))).to.equal(toWei('0.000000000000000005'));
		});

		it('should return tokens even if idleToken total supply increases', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idletoken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));
			expect(await idleYieldSource.sharesToToken(toWei('10'))).to.equal(toWei('10'));
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idletoken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));
			expect(await idleYieldSource.sharesToToken(toWei('10'))).to.equal(toWei('10'));
		});
	});

	const supplyTokenTo = async(user: SignerWithAddress, userAmount: BigNumber) => {
		const userAddress = user.address;
		await underlyingToken.mock.balanceOf.withArgs(yieldSourceOwner.address).returns(toWei('200'));
		await idletoken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('300'));
		await idletoken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));
		await underlyingToken.mock.transferFrom
			.withArgs(userAddress, idleYieldSource.address, userAmount)
			.returns(true);
		await underlyingToken.mock.allowance
			.withArgs(idleYieldSource.address, idletoken.address)
			.returns(toWei('0'));
		await underlyingToken.mock.approve.withArgs(idletoken.address, userAmount).returns(true);
		await idletoken.mock.mintIdleToken
			.withArgs(userAmount, false, '0x0000000000000000000000000000000000000000')
			.returns(toWei('100'));
		await idleYieldSource.connect(user).supplyTokenTo(userAmount, userAddress);
	};

	describe('supplyTokenTo()', () => {
		let amount: BigNumber;

		beforeEach(async() => {
			amount = toWei('100');
		});

		it('should supply assets if totalSupply is 0', async() => {
			await supplyTokenTo(yieldSourceOwner, amount);
			expect(await idleYieldSource.totalShare()).to.equal(toWei('300'));
		});

		it('should supply assets if totalSupply is not 0', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mint(wallet2.address, toWei('100'));
			await supplyTokenTo(yieldSourceOwner, amount);
		});

		it('should revert on error', async() => {
			await underlyingToken.mock.approve.withArgs(idletoken.address, amount).returns(true);
			

			await idletoken.mock.mintIdleToken
				.withArgs(amount, false, '0x0000000000000000000000000000000000000000')
				.returns(toWei('100'));

			await expect(
				idleYieldSource.supplyTokenTo(amount, idleYieldSource.address),
			).to.be.revertedWith('');
		});
	});

	describe('redeemToken()', () => {
		let yieldSourceOwnerBalance: BigNumber;
		let redeemAmount: BigNumber;

		beforeEach(() => {
			yieldSourceOwnerBalance = toWei('300');
			redeemAmount = toWei('100');
		});

		it('should redeem assets', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, yieldSourceOwnerBalance);
			await idletoken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));
			await idletoken.mock.redeemIdleToken.withArgs(redeemAmount).returns(redeemAmount);
			await underlyingToken.mock.transfer
				.withArgs(
					yieldSourceOwner.address, 
					await idleYieldSource.tokenToShares(redeemAmount))
				.returns(true);
			await idleYieldSource.connect(yieldSourceOwner).redeemToken(redeemAmount);
			expect(await idleYieldSource.balanceOf(yieldSourceOwner.address)).to.equal(
				yieldSourceOwnerBalance.sub(redeemAmount),
			);
		});

		it('should not be able to redeem assets if balance is 0', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('0'));
			await idletoken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));
			await idletoken.mock.redeemIdleToken.withArgs(toWei('0')).returns(toWei('0'));
			await underlyingToken.mock.transfer
				.withArgs(yieldSourceOwner.address, await idleYieldSource.tokenToShares(toWei('0'))).returns(true);
			await expect(
				idleYieldSource.connect(yieldSourceOwner).redeemToken(redeemAmount),
			).to.be.reverted;
		});

		it('should fail to redeem if amount superior to balance', async() => {
			const yieldSourceOwnerLowBalance = toWei('10');
			await idleYieldSource.mint(yieldSourceOwner.address, yieldSourceOwnerLowBalance);
			await idletoken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));
			await idletoken.mock.redeemIdleToken
				.withArgs(redeemAmount)
				.returns(redeemAmount);
			await expect(
				idleYieldSource.connect(yieldSourceOwner).redeemToken(redeemAmount),
			).to.be.revertedWith('ERC20: burn amount exceeds balance');
		});
	});

	describe('sponsor()', () => {
		let amount: BigNumber;

		beforeEach(async() => {
			amount = toWei('300');
		});

		it('should sponsor Yield Source', async() => {
			const wallet2Amount = toWei('200');
			await idleYieldSource.mint(wallet2.address, wallet2Amount);
			await idletoken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));
			await underlyingToken.mock.transferFrom
				.withArgs(yieldSourceOwner.address, idleYieldSource.address, amount)
				.returns(true);
			await underlyingToken.mock.allowance
				.withArgs(idleYieldSource.address, idletoken.address)
				.returns(toWei('0'));
			await underlyingToken.mock.approve.withArgs(idletoken.address, amount).returns(true);
			await idletoken.mock.mintIdleToken
				.withArgs(amount, false, '0x0000000000000000000000000000000000000000')
				.returns(toWei('0'));
			await idleYieldSource.connect(yieldSourceOwner).sponsor(amount);
			await idletoken.mock.balanceOf
				.withArgs(idleYieldSource.address)
				.returns(amount.add(wallet2Amount));
			expect(await idleYieldSource.balanceOfToken(wallet2.address)).to.equal(
				toWei('200'),
			);
		});

		it('should revert on error', async() => {
			await underlyingToken.mock.transferFrom
				.withArgs(yieldSourceOwner.address, idleYieldSource.address, amount)
				.returns(true);
			await underlyingToken.mock.allowance
				.withArgs(idleYieldSource.address, idletoken.address)
				.returns(toWei('0'));
			await underlyingToken.mock.approve.withArgs(idletoken.address, amount).returns(true);
			await idletoken.mock.mintIdleToken
				.withArgs(amount, false, '0x0000000000000000000000000000000000000000')
				.reverts();
			await expect(idleYieldSource.connect(yieldSourceOwner).sponsor(amount)).to.be.revertedWith('');
		});
	});

  describe('transferERC20()', () => {
    it('should transferERC20 if yieldSourceOwner', async () => {
      const transferAmount = toWei('10');
      await erc20Token.mock.transfer.withArgs(wallet2.address, transferAmount).returns(true);
      await idleYieldSource
        .connect(contractsOwner)
        .transferERC20(erc20Token.address, wallet2.address, transferAmount);
    });

    it('should transferERC20 if assetManager', async () => {
      const transferAmount = toWei('10');
      await erc20Token.mock.transfer
        .withArgs(yieldSourceOwner.address, transferAmount)
        .returns(true);
      await idleYieldSource.connect(contractsOwner).setAssetManager(wallet2.address);
      await idleYieldSource
        .connect(wallet2)
        .transferERC20(erc20Token.address, yieldSourceOwner.address, transferAmount);
    });

    it('should not allow to transfer idleToken', async () => {
      await expect(
        idleYieldSource
          .connect(contractsOwner)
          .transferERC20(idletoken.address, wallet2.address, toWei('10')),
      ).to.be.revertedWith('IdleYieldSource/idleDai-transfer-not-allowed');
    });

    it('should fail to transferERC20 if not contractsOwner or assetManager', async () => {
      await expect(
        idleYieldSource
          .connect(wallet2)
          .transferERC20(erc20Token.address, yieldSourceOwner.address, toWei('10')),
      ).to.be.revertedWith('OwnerOrAssetManager: caller is not owner or asset manager');
    });
  });
});

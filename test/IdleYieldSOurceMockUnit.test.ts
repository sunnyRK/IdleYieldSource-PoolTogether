import {
	expect
} from 'chai';
import {
	deployMockContract,
	MockContract
} from 'ethereum-waffle';
import {
	Contract,
	ContractFactory,
	Signer
} from 'ethers';
const {
	formatEther,
	parseEther
} = require('@ethersproject/units')
import {
	ethers,
	waffle
} from 'hardhat';
import * as hre from "hardhat"
import {
	Interface
} from 'ethers/lib/utils';
import {
	BigNumber
} from '@ethersproject/bignumber';
import {
	JsonRpcProvider
} from '@ethersproject/providers';
import {
	SignerWithAddress
} from '@nomiclabs/hardhat-ethers/signers';
import daiAbi from '../abis/daiAbi.json';
import SafeERC20Upgradeable from '../artifacts/@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol/SafeERC20Upgradeable.json';
import IYieldSourceABI from "../artifacts/contracts/IdleYieldSource.sol/IdleYieldSource.json";
import IIdleTokenABI from "../artifacts/contracts/interfaces/idle/IIdleToken.sol/IIdleToken.json";
import IdleYieldSourceProxyFactoryABI from "../artifacts/contracts/IdleYieldSourceProxyFactory.sol/IdleYieldSourceProxyFactory.json";
import IGenericProxyFactoryABI from "../artifacts/contracts/interfaces/GenericProxyFactory/IGenericProxyFactory.sol/IGenericProxyFactory.json";
import SafeERC20WrapperUpgradeable from '../artifacts/contracts/test/SafeERC20WrapperUpgradeable.sol/SafeERC20WrapperUpgradeable.json';

import {
	IdleYieldSourceHarness,
	IIdleToken as IIdleTokenCont,
	IERC20Upgradeable as ERC20,
	IIdleToken,
	IdleYieldSourceProxyFactory,
	IdleYieldSourceProxyFactoryHarness,
	IdleYieldSource
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

		// const IdleYieldSource = await ethers.getContractFactory(
		// 	'IdleYieldSourceHarness',
		// );
		// const hardhatIdleYieldSourceHarness = await IdleYieldSource.deploy(idletoken.address)

		const genericProxyFactoryContract = await ethers.getContractFactory('GenericProxyFactory');
		const hardhatGenericProxyFactory = await genericProxyFactoryContract.deploy()

		const idleYieldSourceProxyFactory = await ethers.getContractFactory(
			'IdleYieldSourceProxyFactoryHarness'
		);
		const hardhatIdleYieldSourceProxyFactory = (await idleYieldSourceProxyFactory.deploy(
				// hardhatIdleYieldSourceHarness.address, 
				idletoken.address,
				hardhatGenericProxyFactory.address
			) as unknown) as IdleYieldSourceProxyFactoryHarness;

		// const instanceAddr = await hardhatIdleYieldSourceProxyFactory.instance()

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
		await idleYieldSource.initialize(idletoken.address)
	})

	describe('create()', () => {
		it('should create IdleYieldSource', async() => {
			const _idleToken = await idleYieldSource.idleToken()
			const _underlyingAsset = await idleYieldSource.underlyingAsset()
			const _depositToken = await idleYieldSource.depositToken()

			expect(_idleToken).to.equal(idletoken.address)
			expect(_underlyingAsset).to.equal(underlyingToken.address)
			expect(_depositToken).to.equal(underlyingToken.address)
		});
	});

	describe('depositToken()', () => {
		it('should return the underlying token', async() => {
			expect(await idleYieldSource.depositToken()).to.equal(underlyingToken.address);
		});
	});

	describe('balanceOfToken()', () => {
		it('should return user balance', async() => {
			// await underlyingToken.mock.approve.withArgs(idleYieldSource.address, maxValue)
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'))
			await idleYieldSource.mint(wallet2.address, toWei('100'))
			await idleYieldSource.mintTotalUnderlyingAsset(toWei('200'))
			await idletoken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('200'));
			expect(await idleYieldSource.balanceOfToken(wallet2.address)).to.equal(toWei('100'));
		});
	});

	describe('_tokenToShares()', () => {
		it('should return shares amount', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mint(wallet2.address, toWei('100'))
			await idleYieldSource.mintTotalUnderlyingAsset(toWei('200'))
			await idletoken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('200'))
			const tokenToShares = await idleYieldSource.tokenToShares(toWei('20'));
			expect(parseInt(formatEther(tokenToShares.toString())).toString()).to.equal('20');
		});

		it('should return 0 if tokens param is 0', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mint(wallet2.address, toWei('100'))
			await idleYieldSource.mintTotalUnderlyingAsset(toWei('200'))
			await idletoken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('200'))
			expect(await idleYieldSource.tokenToShares(toWei('0'))).to.equal(toWei('0'));
		});

		it('should return tokens if totalSupply is 0', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('0'));
			await idleYieldSource.mint(wallet2.address, toWei('0'));
			await idleYieldSource.mintTotalUnderlyingAsset(toWei('0'));
			await idletoken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('0'));
			expect(await idleYieldSource.tokenToShares(toWei('100'))).to.equal(toWei('100'));
		});

		it('should return shares even if idleToken total supply has a lot of decimals', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('0.000000000000000005'));
			await idleYieldSource.mint(wallet2.address, toWei('0.000000000000000005'));
			await idleYieldSource.mintTotalUnderlyingAsset(toWei('0.00000000000000001'));
			await idletoken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('0.000000000000000005'));
			expect(await idleYieldSource.tokenToShares(toWei('0.000000000000000005'))).to.equal(toWei('0.000000000000000002'));
		});

		it('should return shares even if idleToken total supply increases', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mintTotalUnderlyingAsset(toWei('100'));
			await idletoken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('100'));
			expect(await idleYieldSource.tokenToShares(toWei('10'))).to.equal(toWei('10'));
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mintTotalUnderlyingAsset(toWei('100'));
			await idletoken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('200'));
			expect(await idleYieldSource.tokenToShares(toWei('10'))).to.equal(toWei('10'));
		});
	});

	describe('_sharesToToken()', () => {
		it('should return tokens amount', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mint(wallet2.address, toWei('100'));
			await idleYieldSource.mintTotalUnderlyingAsset(toWei('200'));
			await idletoken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('400'));
			expect(await idleYieldSource.sharesToToken(toWei('20'))).to.equal(toWei('10'));
		});

		it('should return shares if totalSupply is 0', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('0'));
			await idleYieldSource.mint(wallet2.address, toWei('0'));
			await idleYieldSource.mintTotalUnderlyingAsset(toWei('0'));
			await idletoken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('0'));
			expect(await idleYieldSource.sharesToToken(toWei('100'))).to.equal(toWei('100'));
		});

		it('should return tokens even if totalSupply has a lot of decimals', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('0.000000000000000005'));
			await idleYieldSource.mint(wallet2.address, toWei('0.000000000000000005'));
			await idleYieldSource.mintTotalUnderlyingAsset(toWei('0.00000000000000001'));
			await idletoken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('0.000000000000000005'));
			expect(await idleYieldSource.sharesToToken(toWei('0.000000000000000005'))).to.equal(toWei('0.00000000000000001'));
		});

		it('should return tokens even if idleToken total supply increases', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mintTotalUnderlyingAsset(toWei('100'));
			await idletoken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('100'));
			expect(await idleYieldSource.sharesToToken(toWei('10'))).to.equal(toWei('10'));
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mintTotalUnderlyingAsset(toWei('100'));
			await idletoken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('200'));
			expect(await idleYieldSource.sharesToToken(toWei('10'))).to.equal(toWei('10'));
		});
	});

	const supplyTokenTo = async(user: SignerWithAddress, userAmount: BigNumber) => {
		const userAddress = user.address;

		await underlyingToken.mock.balanceOf.withArgs(yieldSourceOwner.address).returns(toWei('200'));
		await idletoken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('300'));
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
			await idleYieldSource.mintTotalUnderlyingAsset(toWei('200'));
			await idletoken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('200'));
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
			await idleYieldSource.mintTotalUnderlyingAsset(yieldSourceOwnerBalance);
			await idletoken.mock.balanceOf.withArgs(idleYieldSource.address).returns(yieldSourceOwnerBalance);
			await idletoken.mock.redeemIdleToken.withArgs(redeemAmount).returns(redeemAmount);
			await underlyingToken.mock.transfer
				.withArgs(
					yieldSourceOwner.address, 
					await idleYieldSource.tokenToShares(redeemAmount))
				.returns(true);
			await idleYieldSource.connect(yieldSourceOwner).redeemToken(redeemAmount);
			expect(await idleYieldSource.balances(yieldSourceOwner.address)).to.equal(
				yieldSourceOwnerBalance.sub(redeemAmount),
			);
		});

		it('should not be able to redeem assets if balance is 0', async() => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('0'));
			await idleYieldSource.mintTotalUnderlyingAsset(toWei('0'));
			await idletoken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('0'));
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
            await idleYieldSource.mintTotalUnderlyingAsset(yieldSourceOwnerLowBalance);
			await idletoken.mock.balanceOf
				.withArgs(idleYieldSource.address)
				.returns(yieldSourceOwnerLowBalance);
			await idletoken.mock.redeemIdleToken
				.withArgs(redeemAmount)
				.returns(redeemAmount);

			await expect(
				idleYieldSource.connect(yieldSourceOwner).redeemToken(redeemAmount),
			).to.be.reverted;
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
			await idleYieldSource.mintTotalUnderlyingAsset(toWei('200'));

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
				toWei('80'),
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

			await expect(idleYieldSource.connect(yieldSourceOwner).sponsor(amount)).to.be.revertedWith(
				'',
			);
		});
	});

});
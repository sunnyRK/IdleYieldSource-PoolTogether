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

describe('Idle Yield Source', () => {
	let contractsOwner: SignerWithAddress;
	let yieldSourceOwner: SignerWithAddress;
	let wallet2: SignerWithAddress;
	let provider: JsonRpcProvider;
	let idleYieldSource: any;
	let erc20Token: ERC20;
	let underlyingToken: any;
	let idleToken: IIdleToken;
	let maxValue: BigNumber;

	let isInitializeTest = false;

	const randomWallet = ethers.Wallet.createRandom();

  const initializeIdleYieldSource = async (
    idleTokenAddress: string,
		idleReferralAddress: string,
  ) => {
    await idleYieldSource.initialize(
      idleTokenAddress,
			idleReferralAddress,
    );
  };

	beforeEach(async() => {
		[contractsOwner, yieldSourceOwner, wallet2] = await ethers.getSigners();
		maxValue = ethers.constants.MaxUint256;
		provider = waffle.provider;

		erc20Token = ((await deployMockContract(
			contractsOwner,
			SafeERC20WrapperUpgradeable.abi,
		)) as unknown) as ERC20;

		underlyingToken = ((await deployMockContract(
			contractsOwner,
			SafeERC20WrapperUpgradeable.abi,
		)) as unknown) as ERC20;

		idleToken = ((await deployMockContract(contractsOwner, IIdleTokenABI.abi)) as unknown) as IIdleToken;
		await idleToken.mock.token.returns(underlyingToken.address);

		const genericProxyFactoryContract = await ethers.getContractFactory('GenericProxyFactory');
		const hardhatGenericProxyFactory = await genericProxyFactoryContract.deploy();

		const idleYieldSourceProxyFactory = await ethers.getContractFactory(
			'IdleYieldSourceProxyFactoryHarness'
		);
		const hardhatIdleYieldSourceProxyFactory = (await idleYieldSourceProxyFactory.deploy(
				idleToken.address,
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

		await idleToken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));

		await underlyingToken.mock.allowance
			.withArgs(idleYieldSource.address, idleToken.address)
			.returns(ethers.constants.Zero);
		await underlyingToken.mock.approve.withArgs(idleToken.address, maxValue).returns(true);

		if (!isInitializeTest) {
			await initializeIdleYieldSource(idleToken.address, randomWallet.address);
		}
	});

	describe('initialize()', () => {
		before(() => {
      isInitializeTest = true;
    });

    after(() => {
      isInitializeTest = false;
    });


		it('should initialize IdleYieldSource', async() => {
			await initializeIdleYieldSource(idleToken.address, randomWallet.address);

			expect(await idleYieldSource.idleToken()).to.equal(idleToken.address);
			expect(await idleYieldSource.referralAddress()).to.equal(randomWallet.address);
			expect(await idleYieldSource.owner()).to.equal(contractsOwner.address);
		});

    it('should fail if idleToken is address zero', async () => {
      await expect(
				initializeIdleYieldSource(ethers.constants.AddressZero, randomWallet.address)
      ).to.be.revertedWith('IdleYieldSource/idleToken-not-zero-address');
    });

    it('should fail if referral address is address zero', async () => {
      await expect(
				initializeIdleYieldSource(idleToken.address, ethers.constants.AddressZero)
      ).to.be.revertedWith('IdleYieldSource/referralAddress-not-zero-address');
    });
	});

	describe('setReferralAddress()', () => {
		it('should set referral address', async () => {
			await idleYieldSource.connect(contractsOwner).setReferralAddress(randomWallet.address);

			expect(await idleYieldSource.referralAddress()).to.equal(randomWallet.address);
		});

		it('should fail if referral address is address zero', async () => {
			await expect(
				idleYieldSource.connect(contractsOwner).setReferralAddress(ethers.constants.AddressZero)
			).to.be.revertedWith('IdleYieldSource/referralAddress-not-zero-address');
		});

		it('should fail if not owner', async () => {
			await expect(
				idleYieldSource.connect(wallet2).setReferralAddress(ethers.constants.AddressZero)
			).to.be.revertedWith('Ownable: caller is not the owner');
		});
	});

	describe('approveMaxAmount()', () => {
    it('should approve Idle token to spend max uint256 amount', async () => {
      await underlyingToken.mock.allowance.withArgs(idleYieldSource.address, idleToken.address).returns(maxValue);

			expect(await idleYieldSource.connect(contractsOwner).callStatic.approveMaxAmount()).to.equal(true);
      expect(await underlyingToken.allowance(idleYieldSource.address, idleToken.address)).to.equal(maxValue);
    });

		it('should fail if not contractsOwner', async () => {
			await expect(idleYieldSource.connect(wallet2).callStatic.approveMaxAmount()).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

	describe('depositToken()', () => {
		it('should return the underlying token', async () => {
			expect(await idleYieldSource.depositToken()).to.equal(underlyingToken.address);
		});
	});

	describe('balanceOfToken()', () => {
		it('should return user balance', async () => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mint(wallet2.address, toWei('100'));
			await idleToken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('1000'))

			expect(await idleYieldSource.callStatic.balanceOfToken(wallet2.address)).to.equal(toWei('500'));
		});
	});

	describe('_tokenToShares()', () => {
		it('should return shares amount', async () => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mint(wallet2.address, toWei('100'));
			await idleToken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('1000'));

			expect(await idleYieldSource.tokenToShares(toWei('10'))).to.equal(toWei('2'));
		});

		it('should return 0 if tokens param is 0', async () => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mint(wallet2.address, toWei('100'));
			await idleToken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('1000'));

			expect(await idleYieldSource.tokenToShares(toWei('0'))).to.equal(toWei('0'));
		});

		it('should return tokens if totalSupply is 0', async () => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('0'));
			await idleYieldSource.mint(wallet2.address, toWei('0'));
			await idleToken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('0'));

			expect(await idleYieldSource.tokenToShares(toWei('100'))).to.equal(toWei('100'));
		});

		it('should return shares even if idleToken total supply has a lot of decimals', async () => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('1'));
			await idleToken.mock.balanceOf
        .withArgs(idleYieldSource.address)
        .returns(toWei('0.000000000000000005'));

			expect(await idleYieldSource.tokenToShares(toWei('0.000000000000000005'))).to.equal(toWei('1'));
		});

		it('should return shares even if idleToken total supply increases', async () => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mint(wallet2.address, toWei('100'));
      await idleToken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('100'));

      expect(await idleYieldSource.tokenToShares(toWei('1'))).to.equal(toWei('2'));

			await idleToken.mock.balanceOf.withArgs(idleYieldSource.address).returns(ethers.utils.parseUnits('100', 36));
      expect(await idleYieldSource.tokenToShares(toWei('1'))).to.equal(2);
		});
	});

	describe('_sharesToToken()', () => {
		it('should return tokens amount', async () => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mint(wallet2.address, toWei('100'));
			await idleToken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('1000'));

      expect(await idleYieldSource.sharesToToken(toWei('2'))).to.equal(toWei('10'));
		});

		it('should return shares if totalSupply is 0', async () => {
			expect(await idleYieldSource.sharesToToken(toWei('100'))).to.equal(toWei('100'));
		});

		it('should return tokens even if totalSupply has a lot of decimals', async () => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('0.000000000000000005'));
      await idleToken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('100'));

      expect(await idleYieldSource.sharesToToken(toWei('0.000000000000000005'))).to.equal(toWei('100'));
		});

		it('should return tokens even if idleToken total supply increases', async () => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
      await idleYieldSource.mint(wallet2.address, toWei('100'));
      await idleToken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('100'));

      expect(await idleYieldSource.sharesToToken(toWei('2'))).to.equal(toWei('1'));

      await idleToken.mock.balanceOf.withArgs(idleYieldSource.address).returns(ethers.utils.parseUnits('100', 36));
      expect(await idleYieldSource.sharesToToken(2)).to.equal(toWei('1'));
		});
	});

	const supplyTokenTo = async (user: SignerWithAddress, userAmount: BigNumber) => {
		const userAddress = user.address;

		await underlyingToken.mock.balanceOf.withArgs(yieldSourceOwner.address).returns(toWei('200'));

		await idleToken.mock.balanceOf.withArgs(idleYieldSource.address).returns(toWei('300'));
		await idleToken.mock.tokenPriceWithFee.withArgs(idleYieldSource.address).returns(toWei('1'));

		await underlyingToken.mock.transferFrom
			.withArgs(userAddress, idleYieldSource.address, userAmount)
			.returns(true);

		await underlyingToken.mock.allowance
			.withArgs(idleYieldSource.address, idleToken.address)
			.returns(toWei('0'));

		await underlyingToken.mock.approve.withArgs(idleToken.address, userAmount).returns(true);
		await idleToken.mock.mintIdleToken
			.withArgs(userAmount, false, randomWallet.address)
			.returns(toWei('100'));

		await idleYieldSource.connect(user).supplyTokenTo(userAmount, userAddress);
	};

	describe('supplyTokenTo()', () => {
		let amount: BigNumber;

		beforeEach(async () => {
			amount = toWei('100');
		});

		it('should supply assets if totalSupply is 0', async () => {
			await supplyTokenTo(yieldSourceOwner, amount);
			expect(await idleYieldSource.totalSupply()).to.equal(amount);
		});

		it('should supply assets if totalSupply is not 0', async () => {
			await idleYieldSource.mint(yieldSourceOwner.address, toWei('100'));
			await idleYieldSource.mint(wallet2.address, toWei('100'));
			await supplyTokenTo(yieldSourceOwner, amount);
		});

		it('should revert on error', async () => {
			await underlyingToken.mock.approve.withArgs(idleToken.address, amount).returns(true);
			await idleToken.mock.mintIdleToken
				.withArgs(amount, false, randomWallet.address)
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

		it('should redeem assets', async () => {
			await idleYieldSource.mint(yieldSourceOwner.address, yieldSourceOwnerBalance);

			await idleToken.mock.balanceOf
        .withArgs(idleYieldSource.address)
        .returns(yieldSourceOwnerBalance);

			await idleToken.mock.redeemIdleToken.withArgs(redeemAmount).returns(redeemAmount);

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

		it('should not be able to redeem assets if balance is 0', async () => {
			const zeroBalance = toWei('0');

			await idleYieldSource.mint(yieldSourceOwner.address, zeroBalance);

			await idleToken.mock.balanceOf
        .withArgs(idleYieldSource.address)
        .returns(zeroBalance);

			await idleToken.mock.redeemIdleToken.withArgs(zeroBalance).returns(zeroBalance);

			await expect(
				idleYieldSource.connect(yieldSourceOwner).redeemToken(redeemAmount),
			).to.be.revertedWith('ERC20: burn amount exceeds balance');
		});

		it('should fail to redeem if amount superior to balance', async () => {
			const yieldSourceOwnerLowBalance = toWei('10');
			await idleYieldSource.mint(yieldSourceOwner.address, yieldSourceOwnerLowBalance);

			await idleToken.mock.balanceOf
        .withArgs(idleYieldSource.address)
        .returns(yieldSourceOwnerLowBalance);

			await idleToken.mock.redeemIdleToken
				.withArgs(redeemAmount)
				.returns(redeemAmount);

			await expect(
				idleYieldSource.connect(yieldSourceOwner).redeemToken(redeemAmount),
			).to.be.revertedWith('ERC20: burn amount exceeds balance');
		});
	});

	describe('sponsor()', () => {
		let amount: BigNumber;

		beforeEach(async () => {
			amount = toWei('300');
		});

		it('should sponsor Yield Source', async () => {
			const wallet2Amount = toWei('100');
			await idleYieldSource.mint(wallet2.address, wallet2Amount);

			await underlyingToken.mock.transferFrom
				.withArgs(yieldSourceOwner.address, idleYieldSource.address, amount)
				.returns(true);

			await underlyingToken.mock.allowance
				.withArgs(idleYieldSource.address, idleToken.address)
				.returns(toWei('0'));

			await underlyingToken.mock.approve.withArgs(idleToken.address, amount).returns(true);
			await idleToken.mock.mintIdleToken
				.withArgs(amount, false, randomWallet.address)
				.returns(toWei('0'));

			await idleYieldSource.connect(yieldSourceOwner).sponsor(amount);
			await idleToken.mock.balanceOf
				.withArgs(idleYieldSource.address)
				.returns(amount.add(wallet2Amount));
			expect(await idleYieldSource.balanceOfToken(wallet2.address)).to.equal(amount.add(wallet2Amount));
		});

		it('should revert on error', async () => {
			await underlyingToken.mock.transferFrom
				.withArgs(yieldSourceOwner.address, idleYieldSource.address, amount)
				.returns(true);
			await underlyingToken.mock.allowance
				.withArgs(idleYieldSource.address, idleToken.address)
				.returns(toWei('0'));
			await underlyingToken.mock.approve.withArgs(idleToken.address, amount).returns(true);
			await idleToken.mock.mintIdleToken
				.withArgs(amount, false, randomWallet.address)
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
          .transferERC20(idleToken.address, wallet2.address, toWei('10')),
      ).to.be.revertedWith('IdleYieldSource/idleToken-transfer-not-allowed');
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

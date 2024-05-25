const chai = require('chai');
const { ethers } = require('hardhat');
const { MaxUint256 } = require('ethers').constants;
const { keccak256, defaultAbiCoder, toUtf8Bytes, hexlify } =
  require('ethers').utils;
const { BigNumber, Contract } = require('ethers');
const { expect } = require('chai');
const { getApprovalDigest, expandTo18Decimals } = require('./helpers.js');
const { solidity, MockProvider } = require('ethereum-waffle');
const { ecsign } = require('ethereumjs-util');

// import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'

// import DeflatingERC20 from '../build/DeflatingERC20.json'

chai.use(solidity);

const MINIMUM_LIQUIDITY = BigNumber.from(10).pow(3);

const overrides = {
  gasLimit: 9999999,
};
let wallet, other, pk;
describe('DragonswapRouter', () => {
  let factory;
  let chainId;
  let token0;
  let token1;
  let router;
  let pair;
  before(async () => {
    [wallet, other] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    chainId = network.chainId;
    const accounts = config.networks.hardhat.accounts;
    pk = ethers.Wallet.fromMnemonic(
      accounts.mnemonic,
      accounts.path + `/0`
    ).privateKey;
  });
  beforeEach(async function () {
    const WETHFactory = await ethers.getContractFactory('WSEI');
    const WETH = await WETHFactory.connect(wallet).deploy();

    const factoryFactory = await ethers.getContractFactory('DragonswapFactory');
    factory = await factoryFactory.connect(wallet).deploy(wallet.address);

    const routerFactory = await ethers.getContractFactory('DragonswapRouter');
    router = await routerFactory
      .connect(wallet)
      .deploy(factory.address, WETH.address);

    const erc20Factory = await ethers.getContractFactory('contracts/test/ERC20.sol:ERC20');
    const tokenA = await erc20Factory
      .connect(wallet)
      .deploy(expandTo18Decimals(10000));
    const tokenB = await erc20Factory
      .connect(wallet)
      .deploy(expandTo18Decimals(10000));

    await factory.connect(wallet).createPair(tokenA.address, tokenB.address);
    const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
    const uniswapV2PairFactory =
      await ethers.getContractFactory('DragonswapPair');
    pair = new Contract(
      pairAddress,
      JSON.parse(uniswapV2PairFactory.interface.format('json')),
      ethers.provider
    ).connect(wallet);

    const token0Address = (await pair.token0()).address;
    token0 = tokenA.address === token0Address ? tokenA : tokenB;
    token1 = tokenA.address === token0Address ? tokenB : tokenA;
  });

  it('quote', async () => {
    expect(
      await router.quote(
        BigNumber.from(1),
        BigNumber.from(100),
        BigNumber.from(200)
      )
    ).to.eq(BigNumber.from(2));
    expect(
      await router.quote(
        BigNumber.from(2),
        BigNumber.from(200),
        BigNumber.from(100)
      )
    ).to.eq(BigNumber.from(1));
    await expect(
      router.quote(BigNumber.from(0), BigNumber.from(100), BigNumber.from(200))
    ).to.be.revertedWith('DragonswapLibrary: INSUFFICIENT_AMOUNT');
    await expect(
      router.quote(BigNumber.from(1), BigNumber.from(0), BigNumber.from(200))
    ).to.be.revertedWith('DragonswapLibrary: INSUFFICIENT_LIQUIDITY');
    await expect(
      router.quote(BigNumber.from(1), BigNumber.from(100), BigNumber.from(0))
    ).to.be.revertedWith('DragonswapLibrary: INSUFFICIENT_LIQUIDITY');
  });

  it('getAmountOut', async () => {
    expect(
      await router.getAmountOut(
        BigNumber.from(2),
        BigNumber.from(100),
        BigNumber.from(100)
      )
    ).to.eq(BigNumber.from(1));
    await expect(
      router.getAmountOut(
        BigNumber.from(0),
        BigNumber.from(100),
        BigNumber.from(100)
      )
    ).to.be.revertedWith('DragonswapLibrary: INSUFFICIENT_INPUT_AMOUNT');
    await expect(
      router.getAmountOut(
        BigNumber.from(2),
        BigNumber.from(0),
        BigNumber.from(100)
      )
    ).to.be.revertedWith('DragonswapLibrary: INSUFFICIENT_LIQUIDITY');
    await expect(
      router.getAmountOut(
        BigNumber.from(2),
        BigNumber.from(100),
        BigNumber.from(0)
      )
    ).to.be.revertedWith('DragonswapLibrary: INSUFFICIENT_LIQUIDITY');
  });

  it('getAmountIn', async () => {
    expect(
      await router.getAmountIn(
        BigNumber.from(1),
        BigNumber.from(100),
        BigNumber.from(100)
      )
    ).to.eq(BigNumber.from(2));
    await expect(
      router.getAmountIn(
        BigNumber.from(0),
        BigNumber.from(100),
        BigNumber.from(100)
      )
    ).to.be.revertedWith('DragonswapLibrary: INSUFFICIENT_OUTPUT_AMOUNT');
    await expect(
      router.getAmountIn(
        BigNumber.from(1),
        BigNumber.from(0),
        BigNumber.from(100)
      )
    ).to.be.revertedWith('DragonswapLibrary: INSUFFICIENT_LIQUIDITY');
    await expect(
      router.getAmountIn(
        BigNumber.from(1),
        BigNumber.from(100),
        BigNumber.from(0)
      )
    ).to.be.revertedWith('DragonswapLibrary: INSUFFICIENT_LIQUIDITY');
  });

  it('getAmountsOut', async () => {
    await token0.approve(router.address, MaxUint256);
    await token1.approve(router.address, MaxUint256);
    await router.addLiquidity(
      token0.address,
      token1.address,
      BigNumber.from(10000),
      BigNumber.from(10000),
      0,
      0,
      wallet.address,
      MaxUint256
    );

    await expect(
      router.getAmountsOut(BigNumber.from(2), [token0.address])
    ).to.be.revertedWith('DragonswapLibrary: INVALID_PATH');
    const path = [token0.address, token1.address];
    expect(await router.getAmountsOut(BigNumber.from(2), path)).to.deep.eq([
      BigNumber.from(2),
      BigNumber.from(1),
    ]);
  });

  it('getAmountsIn', async () => {
    await token0.approve(router.address, MaxUint256);
    await token1.approve(router.address, MaxUint256);
    await router.addLiquidity(
      token0.address,
      token1.address,
      BigNumber.from(10000),
      BigNumber.from(10000),
      0,
      0,
      wallet.address,
      MaxUint256
    );

    await expect(
      router.getAmountsIn(BigNumber.from(1), [token0.address])
    ).to.be.revertedWith('DragonswapLibrary: INVALID_PATH');
    const path = [token0.address, token1.address];
    expect(await router.getAmountsIn(BigNumber.from(1), path)).to.deep.eq([
      BigNumber.from(2),
      BigNumber.from(1),
    ]);
  });
});

describe('fee-on-transfer tokens', () => {
  let DTT;
  let WETH;
  let router;
  let pair;
  let chainId;
  let factory;
  before(async () => {
    [wallet, other] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    chainId = network.chainId;
  });
  beforeEach(async function () {
    const WETHFactory = await ethers.getContractFactory('WSEI');
    WETH = await WETHFactory.connect(wallet).deploy();

    const factoryFactory = await ethers.getContractFactory('DragonswapFactory');
    factory = await factoryFactory.connect(wallet).deploy(wallet.address);

    const routerFactory = await ethers.getContractFactory('DragonswapRouter');
    router = await routerFactory
      .connect(wallet)
      .deploy(factory.address, WETH.address);

    const deflatingERC20Factory =
      await ethers.getContractFactory('DeflatingERC20');
    DTT = await deflatingERC20Factory
      .connect(wallet)
      .deploy(expandTo18Decimals(10000));

    // make a DTT<>WETH pair
    await factory.createPair(DTT.address, WETH.address);
    const pairAddress = await factory.getPair(DTT.address, WETH.address);

    const dragonswapFactory = await ethers.getContractFactory('DragonswapPair');
    pair = new Contract(
      pairAddress,
      JSON.parse(dragonswapFactory.interface.format('json')),
      ethers.provider
    ).connect(wallet);
  });

  afterEach(async function () {
    expect(await ethers.provider.getBalance(router.address)).to.eq(0);
  });

  async function addLiquidity(DTTAmount, WETHAmount) {
    await DTT.approve(router.address, MaxUint256);
    await router.addLiquiditySEI(
      DTT.address,
      DTTAmount,
      DTTAmount,
      WETHAmount,
      wallet.address,
      MaxUint256,
      {
        value: WETHAmount,
      }
    );
  }

  it('removeLiquidityETHSupportingFeeOnTransferTokens', async () => {
    const DTTAmount = expandTo18Decimals(1).mul(100).div(99);
    const ETHAmount = expandTo18Decimals(4);
    await addLiquidity(DTTAmount, ETHAmount);

    const expectedLiquidity = expandTo18Decimals(2);
    const nonce = await pair.nonces(wallet.address);

    const digest = await getApprovalDigest(
      pair,
      {
        owner: wallet.address,
        spender: router.address,
        value: expectedLiquidity.sub(MINIMUM_LIQUIDITY),
      },
      nonce,
      MaxUint256,
      chainId
    );
    const { v, r, s } = ecsign(
      Buffer.from(digest.slice(2), 'hex'),
      Buffer.from(pk.slice(2), 'hex')
    );

    const DTTInPair = await DTT.balanceOf(pair.address);
    const WETHInPair = await WETH.balanceOf(pair.address);
    const liquidity = await pair.balanceOf(wallet.address);
    const totalSupply = await pair.totalSupply();
    const NaiveDTTExpected = DTTInPair.mul(liquidity).div(totalSupply);
    const WETHExpected = WETHInPair.mul(liquidity).div(totalSupply);

    await pair.approve(router.address, MaxUint256);
    await router.removeLiquiditySEIWithPermitSupportingFeeOnTransferTokens(
      DTT.address,
      liquidity,
      NaiveDTTExpected,
      WETHExpected,
      wallet.address,
      MaxUint256,
      false,
      v,
      r,
      s
    );
  });

  it('removeLiquidityETHWithPermitSupportingFeeOnTransferTokens', async () => {
    const DTTAmount = expandTo18Decimals(1).mul(100).div(99);
    const ETHAmount = expandTo18Decimals(4);
    await addLiquidity(DTTAmount, ETHAmount);

    const expectedLiquidity = expandTo18Decimals(2);
    const nonce = await pair.nonces(wallet.address);

    const digest = await getApprovalDigest(
      pair,
      {
        owner: wallet.address,
        spender: router.address,
        value: expectedLiquidity.sub(MINIMUM_LIQUIDITY),
      },
      nonce,
      MaxUint256,
      chainId
    );
    const { v, r, s } = ecsign(
      Buffer.from(digest.slice(2), 'hex'),
      Buffer.from(pk.slice(2), 'hex')
    );

    const DTTInPair = await DTT.balanceOf(pair.address);
    const WETHInPair = await WETH.balanceOf(pair.address);
    const liquidity = await pair.balanceOf(wallet.address);
    const totalSupply = await pair.totalSupply();
    const NaiveDTTExpected = DTTInPair.mul(liquidity).div(totalSupply);
    const WETHExpected = WETHInPair.mul(liquidity).div(totalSupply);

    await pair.approve(router.address, MaxUint256);
    await router.removeLiquiditySEIWithPermitSupportingFeeOnTransferTokens(
      DTT.address,
      liquidity,
      NaiveDTTExpected,
      WETHExpected,
      wallet.address,
      MaxUint256,
      false,
      v,
      r,
      s,
      overrides
    );
  });

  describe('swapExactTokensForTokensSupportingFeeOnTransferTokens', () => {
    const DTTAmount = expandTo18Decimals(5).mul(100).div(99);
    const ETHAmount = expandTo18Decimals(10);
    const amountIn = expandTo18Decimals(1);

    beforeEach(async () => {
      await addLiquidity(DTTAmount, ETHAmount);
    });

    it('DTT -> WETH', async () => {
      await DTT.approve(router.address, MaxUint256);

      await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        amountIn,
        0,
        [DTT.address, WETH.address],
        wallet.address,
        MaxUint256
      );
    });

    // WETH -> DTT
    it('WETH -> DTT', async () => {
      await WETH.deposit({ value: amountIn }); // mint WETH
      await WETH.approve(router.address, MaxUint256);

      await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        amountIn,
        0,
        [WETH.address, DTT.address],
        wallet.address,
        MaxUint256
      );
    });
  });

  // ETH -> DTT
  it('swapExactETHForTokensSupportingFeeOnTransferTokens', async () => {
    const DTTAmount = expandTo18Decimals(10).mul(100).div(99);
    const ETHAmount = expandTo18Decimals(5);
    const swapAmount = expandTo18Decimals(1);
    await addLiquidity(DTTAmount, ETHAmount);

    await router.swapExactSEIForTokensSupportingFeeOnTransferTokens(
      0,
      [WETH.address, DTT.address],
      wallet.address,
      MaxUint256,
      {
        value: swapAmount,
      }
    );
  });

  // DTT -> ETH
  it('swapExactTokensForETHSupportingFeeOnTransferTokens', async () => {
    const DTTAmount = expandTo18Decimals(5).mul(100).div(99);
    const ETHAmount = expandTo18Decimals(10);
    const swapAmount = expandTo18Decimals(1);

    await addLiquidity(DTTAmount, ETHAmount);
    await DTT.approve(router.address, MaxUint256);

    await router.swapExactTokensForSEISupportingFeeOnTransferTokens(
      swapAmount,
      0,
      [DTT.address, WETH.address],
      wallet.address,
      MaxUint256
    );
  });
});

describe('fee-on-transfer tokens: reloaded', () => {
  let DTT;
  let DTT2;
  let router;
  beforeEach(async function () {
    [wallet, other] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    chainId = network.chainId;

    const WETHFactory = await ethers.getContractFactory('WSEI');
    WETH = await WETHFactory.connect(wallet).deploy();

    const factoryFactory = await ethers.getContractFactory('DragonswapFactory');
    factory = await factoryFactory.connect(wallet).deploy(wallet.address);

    const routerFactory = await ethers.getContractFactory('DragonswapRouter');
    router = await routerFactory
      .connect(wallet)
      .deploy(factory.address, WETH.address);

    const deflatingERC20Factory =
      await ethers.getContractFactory('DeflatingERC20');
    DTT = await deflatingERC20Factory
      .connect(wallet)
      .deploy(expandTo18Decimals(10000));
    DTT2 = await deflatingERC20Factory
      .connect(wallet)
      .deploy(expandTo18Decimals(10000));

    // make a DTT<>WETH pair
    await factory.createPair(DTT.address, DTT2.address);
    const pairAddress = await factory.getPair(DTT.address, DTT2.address);
  });

  afterEach(async function () {
    expect(await ethers.provider.getBalance(router.address)).to.eq(0);
  });

  async function addLiquidity(DTTAmount, DTT2Amount) {
    await DTT.approve(router.address, MaxUint256);
    await DTT2.approve(router.address, MaxUint256);
    await router.addLiquidity(
      DTT.address,
      DTT2.address,
      DTTAmount,
      DTT2Amount,
      DTTAmount,
      DTT2Amount,
      wallet.address,
      MaxUint256
    );
  }

  describe('swapExactTokensForTokensSupportingFeeOnTransferTokens', () => {
    const DTTAmount = expandTo18Decimals(5).mul(100).div(99);
    const DTT2Amount = expandTo18Decimals(5);
    const amountIn = expandTo18Decimals(1);

    beforeEach(async () => {
      await addLiquidity(DTTAmount, DTT2Amount);
    });

    it('DTT -> DTT2', async () => {
      await DTT.approve(router.address, MaxUint256);

      await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        amountIn,
        0,
        [DTT.address, DTT2.address],
        wallet.address,
        MaxUint256
      );
    });
  });
});

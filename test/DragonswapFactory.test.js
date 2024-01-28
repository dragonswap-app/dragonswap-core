const chai = require('chai');
const { ethers } = require('hardhat');
const { AddressZero } = require('ethers').constants;
const { BigNumber, Contract } = require('ethers');
const { expect } = require('chai');
const { getCreate2Address } = require('./helpers.js');
const { solidity } = require('ethereum-waffle');

chai.use(solidity);

const TEST_ADDRESSES = [
  '0x1000000000000000000000000000000000000000',
  '0x2000000000000000000000000000000000000000',
];

describe('DragonswapFactory', () => {
  let chainId;
  let factory;
  beforeEach(async () => {
    [wallet, other] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    chainId = network.chainId;
    const factoryFactory = await ethers.getContractFactory('DragonswapFactory');
    factory = await factoryFactory.connect(wallet).deploy(wallet.address);
  });

  it('feeTo, feeToSetter, allPairsLength', async () => {
    expect(await factory.feeTo()).to.eq(AddressZero);
    expect(await factory.feeToSetter()).to.eq(wallet.address);
    expect(await factory.allPairsLength()).to.eq(0);
  });

  async function createPair(tokens) {
    const dragonswapPairFactory =
      await ethers.getContractFactory('DragonswapPair');
    const bytecode = dragonswapPairFactory.bytecode;
    const create2Address = getCreate2Address(factory.address, tokens, bytecode);
    await expect(factory.createPair(...tokens))
      .to.emit(factory, 'PairCreated')
      .withArgs(
        TEST_ADDRESSES[0],
        TEST_ADDRESSES[1],
        create2Address,
        BigNumber.from(1)
      );

    await expect(factory.createPair(...tokens)).to.be.reverted; // Dragonswap PAIR_EXISTS
    await expect(factory.createPair(...tokens.slice().reverse())).to.be
      .reverted; // Dragonswap PAIR_EXISTS
    expect(await factory.getPair(...tokens)).to.eq(create2Address);
    expect(await factory.getPair(...tokens.slice().reverse())).to.eq(
      create2Address
    );
    expect(await factory.allPairs(0)).to.eq(create2Address);
    expect(await factory.allPairsLength()).to.eq(1);

    const pair = new Contract(
      create2Address,
      JSON.parse(dragonswapPairFactory.interface.format('json')),
      ethers.provider
    );
    expect(await pair.factory()).to.eq(factory.address);
    expect(await pair.token0()).to.eq(TEST_ADDRESSES[0]);
    expect(await pair.token1()).to.eq(TEST_ADDRESSES[1]);
  }

  it('createPair', async () => {
    await createPair(TEST_ADDRESSES);
  });

  it('createPair:reverse', async () => {
    await createPair(TEST_ADDRESSES.slice().reverse());
  });

  it('createPair:gas', async () => {
    const tx = await factory.createPair(...TEST_ADDRESSES);
    const receipt = await tx.wait();
    const expectedGas = 2512920;
    const allowedVariation = 3000000;
    expect(receipt.gasUsed).to.be.within(
      expectedGas - allowedVariation,
      expectedGas + allowedVariation
    );
  });

  it('setFeeTo', async () => {
    await expect(
      factory.connect(other).setFeeTo(other.address)
    ).to.be.revertedWith('Dragonswap: FORBIDDEN');
    await factory.setFeeTo(wallet.address);
    expect(await factory.feeTo()).to.eq(wallet.address);
  });

  it('setFeeToSetter', async () => {
    await expect(
      factory.connect(other).setFeeToSetter(other.address)
    ).to.be.revertedWith('Dragonswap: FORBIDDEN');
    await factory.setFeeToSetter(other.address);
    expect(await factory.feeToSetter()).to.eq(other.address);
    await expect(factory.setFeeToSetter(wallet.address)).to.be.revertedWith(
      'Dragonswap: FORBIDDEN'
    );
  });
});

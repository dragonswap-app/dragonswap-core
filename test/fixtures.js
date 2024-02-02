const { expandTo18Decimals } = require('./helpers');

async function factoryFixture([wallet], provider) {
  const factoryFactory = await ethers.getContractFactory('DragonswapFactory');
  const factory = await factoryFactory.connect(wallet).deploy(wallet.address);
  return { factory };
}

async function pairFixture([wallet], provider) {
  const { factory } = await factoryFixture([wallet], provider);

  const erc20Factory = await ethers.getContractFactory('ERC20');
  const tokenA = await erc20Factory
    .connect(wallet)
    .deploy(expandTo18Decimals(10000));
  const tokenB = await erc20Factory
    .connect(wallet)
    .deploy(expandTo18Decimals(10000));

  await factory.createPair(tokenA.address, tokenB.address);
  const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
  const pair = await ethers.getContractAt('DragonswapPair', pairAddress);

  const token0Address = (await pair.token0()).address;
  const token0 = tokenA.address === token0Address ? tokenA : tokenB;
  const token1 = tokenA.address === token0Address ? tokenB : tokenA;

  return { factory, token0, token1, pair };
}

module.exports = {
  pairFixture,
};

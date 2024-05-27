const hre = require('hardhat');
const { saveJson, jsons } = require('./utils');

async function main() {
  const feeToSetter = '0xfeC4fA7d245C2588686483c8246d5D308CaB8c74';

  const DragonswapPairFactory =
    await hre.ethers.getContractFactory('DragonswapFactory');
  const dragonswapPairFactory = await DragonswapPairFactory.deploy(feeToSetter);
  await dragonswapPairFactory.deployed();
  console.log(
    `Factory deployment tx hash: ${dragonswapPairFactory.deployTransaction.hash}`
  );
  console.log(`Factory address: ${dragonswapPairFactory.address} \n`);
  saveJson(
    jsons.addresses,
    hre.network.name,
    'DragonswapFactory',
    dragonswapPairFactory.address
  );

  const Wsei = await hre.ethers.getContractFactory('WSEI');
  const wsei = await Wsei.deploy();
  await wsei.deployed();
  console.log(`Wsei deployment tx hash: ${wsei.deployTransaction.hash}`);
  console.log(`Wsei address: ${wsei.address} \n`);
  saveJson(jsons.addresses, hre.network.name, 'Wsei', wsei.address);

  const DragonswapRouter =
    await hre.ethers.getContractFactory('DragonswapRouter');
  const dragonswapRouter = await DragonswapRouter.deploy(
    dragonswapPairFactory.address,
    wsei.address
  );
  await dragonswapRouter.deployed();
  console.log(
    `Router deployment tx hash: ${dragonswapRouter.deployTransaction.hash}`
  );
  console.log(`Router address: ${dragonswapRouter.address}`);
  saveJson(
    jsons.addresses,
    hre.network.name,
    'DragonswapRouter',
    dragonswapRouter.address
  );

  console.log('Done!');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

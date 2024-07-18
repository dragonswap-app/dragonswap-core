const hre = require('hardhat');
const { saveJson, jsons } = require('./utils');

async function main() {
  const feeToSetter = '0x328f7689244Bd7D042c4aE9eC18077b6781D6Dd8';

  const feeTo = '0xB6Fa64Ff5d28E238559A2B177CFe9bBe2beD95eB';

  const DragonswapPairFactory = await hre.ethers.getContractFactory('DragonswapFactory');
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

  await dragonswapPairFactory.setFeeTo(feeTo);

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

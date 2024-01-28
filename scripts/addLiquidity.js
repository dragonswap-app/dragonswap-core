const hre = require('hardhat');
const { address } = require('hardhat/internal/core/config/config-validation');
const { ethers } = hre;

/**
 * Get token decimals
 * @param token
 * @returns {Promise<*>}
 */
const getDecimals = async (token) => {
  return await token.decimals();
};

/**
 * Convert to token decimals
 * @param token
 * @param amount
 * @returns {Promise<string>}
 */
const convertToDecimals = async (token, amount) => {
  const decimals = await getDecimals(token);
  return ethers.utils
    .parseUnits(amount.toString(), decimals.toString())
    .toString();
};

/**
 * Approve erc20 token
 * @param token
 * @param amount
 * @param beneficiaryAddress
 * @returns {Promise<*>}
 */
const approveErc20 = async (token, amount, beneficiaryAddress) => {
  const amountDecimals = await convertToDecimals(token, amount);
  return await token.approve(beneficiaryAddress, amountDecimals.toString());
};

/**
 * Get timestamp of the last block
 * @returns {Promise<number>}
 */
const getLatestBlockTimestamp = async () => {
  const blockNumber = await ethers.provider.getBlockNumber('latest');
  const block = await ethers.provider.getBlock(blockNumber);
  return block.timestamp;
};

/**
 * Get account sending the transaction
 * @returns {Promise<string>}
 */
const getAccount = async () => {
  const signer = await ethers.getSigners();
  return signer[0].getAddress();
};

/**
 * Get ERC20 instance
 * @param address
 * @returns {Promise<Contract>}
 */
const getTokenInstance = async (address) => {
  return await hre.ethers.getContractAt(
    'contracts/core/test/ERC20.sol:ERC20',
    address
  );
};

/**
 * Get instance of Dragonswap router
 * @param address
 * @returns {Promise<Contract>}
 */
const getRouterInstance = async (address) => {
  return await hre.ethers.getContractAt('DragonswapRouter', address);
};

/**
 *
 * @param router - router instance
 * @param addressTokenA - address of tokenA
 * @param addressTokenB - address of tokenB
 * @param amountA - amount A, in decade format (example 100, 200 etc)
 * @param amountB - amount B, in decade format (example 100, 200 etc)
 * @param slippage - slippage calculated if it's 3%, the input should be 0.97
 * @returns {Promise<*>}
 */
const addLiquidityERC20 = async (
  router,
  addressTokenA,
  addressTokenB,
  amountA,
  amountB,
  slippage
) => {
  const tokenA = await getTokenInstance(addressTokenA);
  const tokenB = await getTokenInstance(addressTokenB);
  const amountADecimals = await convertToDecimals(tokenA, amountA);
  const amountBDecimals = await convertToDecimals(tokenB, amountB);
  const amountAMin = await convertToDecimals(tokenA, amountA * slippage);
  const amountBMin = await convertToDecimals(tokenB, amountB * slippage);
  const deadline = (await getLatestBlockTimestamp()) + 10000;

  await approveErc20(tokenA, amountADecimals, router.address);
  console.log(
    `Approved ${tokenA.address} for ${amountADecimals} to trade on router: ${router.address}`
  );
  await approveErc20(tokenB, amountBDecimals, router.address);
  console.log(
    `Approved ${tokenB.address} for ${amountBDecimals} to trade on router: ${router.address}`
  );

  const to = await getAccount();

  const resp = await router.addLiquidity(
    tokenA.address,
    tokenB.address,
    amountADecimals,
    amountBDecimals,
    amountAMin,
    amountBMin,
    to,
    deadline
  );

  console.log('Successfully added liquidity and created new pair.');
  return resp.hash;
};

async function main() {
  const routerAddress = '0x7e1090746AB11DC1BbDAcE625644c066ad4cbF6b';

  const router = await getRouterInstance(routerAddress);

  const tokenAddresses = [
    `0xc7198437980c041c805A1EDcbA50c1Ce5db95118`, //test token a
    `0xd1c3f94DE7e5B45fa4eDBBA472491a9f4B166FC4`, // test token b
  ];

  const slippage = 0.97;

  const txHash = await addLiquidityERC20(
    router,
    tokenAddresses[0],
    tokenAddresses[1],
    5,
    5,
    slippage
  );

  console.log(txHash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

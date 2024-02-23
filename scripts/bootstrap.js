const hre = require('hardhat');
const { getJson, saveJson, jsons, sleep} = require('./utils');
const { ethers } = require('hardhat');

const tokens = process.env.TOKENS ? JSON.parse(process.env.TOKENS) : [];
const wallets = process.env.WALLETS ? JSON.parse(process.env.WALLETS): [];

const wait = async () => {await sleep(3000)};

const getRandomNumber = (min, max) => {
    return Math.ceil(Math.random() * (max - min) + min);
}
const deployTokens = async(tokenName, tokenSymbol, tokenDecimals) => {
    const mockTokenFactory = await hre.ethers.getContractFactory('Token');
    const mockToken = await mockTokenFactory.deploy(tokenName, tokenSymbol, tokenDecimals);
    await mockToken.deployed();

    console.log(`${tokenName} address: ${mockToken.address}`);

    saveJson(jsons.addresses, hre.network.name, `${tokenSymbol}`, mockToken.address);

    console.log('Done!');

}

const loadAddresses = async() => {
    const dragonswapRouterAddress = getJson(jsons.addresses)[hre.network.name]["DragonswapRouter"];
    const dragonswapFactoryAddress = getJson(jsons.addresses)[hre.network.name]["DragonswapFactory"];

    const wseiAddress = getJson(jsons.addresses)[hre.network.name]["Wsei"];
    const usdtAddress = getJson(jsons.addresses)[hre.network.name]["USDT"];
    const usdcAddress = getJson(jsons.addresses)[hre.network.name]["USDC"];
    const pythAddress = getJson(jsons.addresses)[hre.network.name]["PYTH"];
    const daiAddress = getJson(jsons.addresses)[hre.network.name]["DAI"];
    const dswapAddress = getJson(jsons.addresses)[hre.network.name]["DSWAP"];
    const gloAddress = getJson(jsons.addresses)[hre.network.name]["GLO"];
    const xavaAddress = getJson(jsons.addresses)[hre.network.name]["XAVA"];

    const dragonswapRouter = await hre.ethers.getContractAt('DragonswapRouter', dragonswapRouterAddress);

    const dragonswapFactory = await hre.ethers.getContractAt('DragonswapFactory', dragonswapFactoryAddress);

    let tether = await hre.ethers.getContractAt("Token", usdtAddress);
    let usdc = await hre.ethers.getContractAt("Token", usdcAddress);
    let pyth = await hre.ethers.getContractAt("Token", pythAddress);
    let dai = await hre.ethers.getContractAt("Token", daiAddress);
    let dswap = await hre.ethers.getContractAt("Token", dswapAddress);
    let glo = await hre.ethers.getContractAt("Token", gloAddress);
    let xava = await hre.ethers.getContractAt("Token", xavaAddress);

    return {
        dragonswapRouter,
        dragonswapFactory,
        wseiAddress,
        tether,
        usdc,
        pyth,
        dai,
        dswap,
        glo,
        xava
    }
}

const createPools = async() => {
    let usdtAmount, usdcAmount, seiAmount, draAmount, pythAmount, dswapAmount, xavaAmount, gloAmount, daiAmount;

    const to = (await hre.ethers.getSigner()).address;

    const deadline = hre.ethers.constants.MaxUint256;

    const {
        dragonswapRouter,
        dragonswapFactory,
        wseiAddress,
        tether,
        usdc,
        pyth,
        dai,
        dswap,
        glo,
        xava
    } = await loadAddresses();

    await wait();

    // Make pool WSEI / USDT
    seiAmount = hre.ethers.utils.parseEther("50");
    usdtAmount = hre.ethers.utils.parseUnits("100",6);

    await tether.approve(dragonswapRouter.address, usdtAmount);
    await wait();
    await dragonswapRouter.addLiquiditySEI(tether.address, usdtAmount, usdtAmount, seiAmount, to, deadline, {value: seiAmount});
    await wait();
    console.log("WSEI/USDT", await dragonswapFactory.getPair(wseiAddress,tether.address));

    // Make pool WSEI / PYTH
    seiAmount = hre.ethers.utils.parseEther(getRandomNumber(20, 50).toString());
    pythAmount = hre.ethers.utils.parseEther(getRandomNumber(10000, 50000).toString());

    await pyth.approve(dragonswapRouter.address, pythAmount);
    await wait();
    await dragonswapRouter.addLiquiditySEI(pyth.address, pythAmount, pythAmount, seiAmount, to, deadline, {value: seiAmount});
    await wait();
    console.log("WSEI/PYTH", await dragonswapFactory.getPair(seilor.address,pyth.address));

    // // Make pool USDT / USDC
    const amountUSDTUSDC = 1000000;
    usdtAmount = hre.ethers.utils.parseUnits(amountUSDTUSDC.toString(), 6);
    usdcAmount = hre.ethers.utils.parseUnits(amountUSDTUSDC.toString(), 6);

    await tether.approve(dragonswapRouter.address, usdtAmount);
    await wait();
    await usdc.approve(dragonswapRouter.address, usdcAmount);
    await wait();
    await dragonswapRouter.addLiquidity(tether.address, usdc.address, usdtAmount, usdcAmount, usdtAmount, usdcAmount, to, deadline);
    await wait();
    console.log("USDT/USDC", await dragonswapFactory.getPair(tether.address, usdc.address));

    // Make pool DSWAP / USDT
    dswapAmount = hre.ethers.utils.parseEther("1000000");
    usdtAmount = hre.ethers.utils.parseUnits("500000", 6);
    await dswap.approve(dragonswapRouter.address, dswapAmount);
    await wait();
    await tether.approve(dragonswapRouter.address, usdtAmount);
    await wait();
    await dragonswapRouter.addLiquidity(tether.address, dswap.address, usdtAmount, dswapAmount, usdtAmount, dswapAmount, to, deadline);
    await wait();
    console.log("DSWAP/USDT", await dragonswapFactory.getPair(dswap.address, tether.address));

    // Make pool XAVA / USDC
    xavaAmount = hre.ethers.utils.parseEther("1000000");
    usdcAmount = hre.ethers.utils.parseUnits("1200000", 6);
    await xava.approve(dragonswapRouter.address, xavaAmount);
    await wait();
    await usdc.approve(dragonswapRouter.address, usdcAmount);
    await wait();
    await dragonswapRouter.addLiquidity(usdc.address, xava.address, usdcAmount, xavaAmount, usdcAmount, xavaAmount, to, deadline);
    await wait();
    console.log("XAVA/USDC", await dragonswapFactory.getPair(xava.address, usdc.address));

    // Make pool DSWAP / USDC
    dswapAmount = hre.ethers.utils.parseEther("1000000");
    usdcAmount = hre.ethers.utils.parseUnits("500000", 6);
    await dswap.approve(dragonswapRouter.address, dswapAmount);
    await wait();
    await usdc.approve(dragonswapRouter.address, usdcAmount);
    await wait();
    await dragonswapRouter.addLiquidity(usdc.address, dswap.address, usdcAmount, dswapAmount, usdcAmount, dswapAmount, to, deadline);
    await wait();
    console.log("DSWAP/USDC", await dragonswapFactory.getPair(dswap.address, usdc.address));

    // Make pool GLO / USDT
    gloAmount = hre.ethers.utils.parseEther("500000");
    usdtAmount = hre.ethers.utils.parseUnits("1000000", 6);
    await glo.approve(dragonswapRouter.address, gloAmount);
    await wait();
    await tether.approve(dragonswapRouter.address, usdtAmount);
    await wait();
    await dragonswapRouter.addLiquidity(tether.address, glo.address, usdtAmount, gloAmount, usdtAmount, gloAmount, to, deadline);
    await wait();
    console.log("GLO/USDT", await dragonswapFactory.getPair(glo.address, tether.address));

    // // Make pool USDC / DAI
    usdcAmount = hre.ethers.utils.parseUnits("500000", 6);
    daiAmount = hre.ethers.utils.parseEther("500000");
    await usdc.approve(dragonswapRouter.address, usdcAmount);
    await wait();
    await dai.approve(dragonswapRouter.address, daiAmount);
    await wait();
    await dragonswapRouter.addLiquidity(usdc.address, dai.address, usdcAmount, daiAmount, usdcAmount, daiAmount, to, deadline);
    await wait()
    console.log("USDC/DAI", await dragonswapFactory.getPair(usdc.address, dai.address));


    console.log(`
    'WSEI/USDT: ${await dragonswapFactory.getPair(wseiAddress,tether.address)}'
    'WSEI/PYTH: ${await dragonswapFactory.getPair(wseiAddress,pyth.address)}'
    'USDT/USDC: ${await dragonswapFactory.getPair(tether.address,usdc.address)}'
    'DSWAP/USDT: ${await dragonswapFactory.getPair(dswap.address,tether.address)}'
    'XAVA/USDC: ${await dragonswapFactory.getPair(xava.address,usdc.address)}'
    'DSWAP/USDC: ${await dragonswapFactory.getPair(dswap.address,usdc.address)}'
    'GLO/USDT: ${await dragonswapFactory.getPair(glo.address,tether.address)}'
    'USDC/DAI: ${await dragonswapFactory.getPair(usdc.address,dai.address)}'
  `);

}

const distributeTokens = async(tokens) => {

    for(let i = 0; i < tokens.length; i++) {
        const tokenAddress = getJson(jsons.addresses)[hre.network.name][tokens[i].symbol];
        const token = await hre.ethers.getContractAt('Token', tokenAddress);
        let amount = getRandomNumber(1000, 10000);

        if (tokens[i].symbol === "USDT" || tokens[i].symbol === "USDC") {
            amount = hre.ethers.utils.parseUnits(amount.toString(), 6);
        } else {
            amount = hre.ethers.utils.parseEther(amount.toString());
        }

        for(let j = 0; j < wallets.length; j++) {
            await wait();
            let resp = await token.transfer(wallets[j], amount);
            console.log(
                `${j + 1}: Done. Sent ${amount} ${tokens[i].symbol} tokens to: ${wallets[j]}`
            );
            console.log(`${j + 1}: TxHash:`, resp.hash);
        }
    }
}


async function main() {

    for (let i = 0; i < tokens.length; i++) {
        await deployTokens(tokens[i].name, tokens[i].symbol, tokens[i].decimals);
    }

    // await createPools();
    //
    // await distributeTokens(tokens);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
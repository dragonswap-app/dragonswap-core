const hre = require('hardhat');
const { getJson, saveJson, jsons, sleep} = require('./utils');
const { ethers } = require('hardhat');

const wallets = [
    '0x7B177Ab8381073865a908A637D480f6BE2eF537e',
    '0x4E60AF2ED6b60E43595b41354b1B7E063d0c0008',
    '0xc3D08b11F8FA3A1777aC6e15cdFc914F4a435f73',
    '0xac1Dc7873d5718D976eDA7B8461138b21CA7F929',
    '0xC7bc6186CbB42C723C32235b69B6a1aE560F79D0',
    '0x58d1Db07ed7e7C17cbF1AFC462B31d47d13fdDe1',
    '0x19f7E4E1B838758F573D1Debf00A95d6A3168830',
    '0x70AD5F5Ed1BB592d910e7F3f50fc6Cd472052F58',
    '0xbEf668797f3331a9E76151bD22FB1646B3CFf006',
    '0xdc1A3696ED4eB3d8616A7f764d5204669ed579f9',
    '0xa74580E51c339022F961c981ed4b8c21dC42425B',
    '0xa18DeCb50Eb1a42A87e903b8038CF137D7830034',
    '0x0ED2Cf4b2288A8C23f4FFFbF59d6dDB2BA94B78c',
    '0x83C5Ba90EeAfE1c844851D26A77e59F78242515e',
    '0xD0CaE2309f322E24fBBc7E9D5F4995B02eF901e4'
]

const wait = async () => {await sleep(3000)};

const getRandomNumber = (min, max) => {
    return Math.ceil(Math.random() * (max - min) + min);
}
const deployTokens = async(tokenName, tokenSymbol) => {
    let mockTokenFactory = null;

    try {
        if (tokenSymbol === "USDT" || tokenSymbol === "USDC") {
            mockTokenFactory = await hre.ethers.getContractFactory('Tether');
        } else {
            mockTokenFactory = await hre.ethers.getContractFactory('Token');
        }

        if (!mockTokenFactory) {
            throw new Error('Contract factory is null.');
        }

        const mockToken = await mockTokenFactory.deploy(tokenName, tokenSymbol);
        await mockToken.deployed();

        console.log(`${tokenName} address: ${mockToken.address}`);

        saveJson(jsons.addresses, hre.network.name, `${tokenSymbol}`, mockToken.address);

        console.log('Done!');

    } catch (error) {
        console.error('Error:', error);
    }
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

    let tether = await hre.ethers.getContractAt("Tether", usdtAddress);
    let usdc = await hre.ethers.getContractAt("Tether", usdcAddress);
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
    await wait();

    // Make pool WSEI / PYTH
    seiAmount = hre.ethers.utils.parseEther(getRandomNumber(20, 50).toString());
    pythAmount = hre.ethers.utils.parseEther(getRandomNumber(10000, 50000).toString());

    await pyth.approve(dragonswapRouter.address, pythAmount);
    await wait();
    await dragonswapRouter.addLiquiditySEI(pyth.address, pythAmount, pythAmount, seiAmount, to, deadline, {value: seiAmount});
    await wait();
    console.log("WSEI/PYTH", await dragonswapFactory.getPair(seilor.address,pyth.address));
    await wait();

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
    await wait();

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
    await wait();

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
    await wait();

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
    await wait();

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
    await wait();

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
    await wait();


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
    await hre.run('compile');

    const tokens = await getJson(jsons.config)[hre.network.name]["tokens"];

    for (let i = 0; i < tokens.length; i++) {
        await deployTokens(tokens[i].name, tokens[i].symbol);
    }

    await createPools();

    await distributeTokens(tokens);


}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MaxUint256 } = require('ethers').constants;
const { keccak256, defaultAbiCoder, toUtf8Bytes, hexlify } =
  require('ethers').utils;
const { BigNumber } = require('ethers');
const { getApprovalDigest, expandTo18Decimals } = require('./helpers.js');
const { ecsign } = require('ethereumjs-util');

const TOTAL_SUPPLY = expandTo18Decimals(10000);
const TEST_AMOUNT = expandTo18Decimals(10);

let wallet, other, pk;
describe('DragonswapERC20', () => {
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

  let token = beforeEach(async () => {
    tokenFactory = await ethers.getContractFactory('contracts/test/ERC20.sol:ERC20');
    token = await tokenFactory.connect(wallet).deploy(TOTAL_SUPPLY);
  });

  it('name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH', async () => {
    const name = await token.name();
    expect(name).equals('Dragonswap');
    expect(await token.symbol()).equals('DS');
    expect(await token.decimals()).equals(18);
    expect(await token.totalSupply()).to.deep.equal(TOTAL_SUPPLY);
    expect(await token.balanceOf(wallet.address)).to.deep.equal(TOTAL_SUPPLY);
    expect(await token.DOMAIN_SEPARATOR()).to.eq(
      keccak256(
        defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
          [
            keccak256(
              toUtf8Bytes(
                'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
              )
            ),
            keccak256(toUtf8Bytes(name)),
            keccak256(toUtf8Bytes('1')),
            chainId,
            token.address,
          ]
        )
      )
    );
    expect(await token.PERMIT_TYPEHASH()).to.eq(
      keccak256(
        toUtf8Bytes(
          'Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'
        )
      )
    );
  });

  it('approve', async () => {
    await expect(token.approve(other.address, TEST_AMOUNT))
      .to.emit(token, 'Approval')
      .withArgs(wallet.address, other.address, TEST_AMOUNT);
    expect(await token.allowance(wallet.address, other.address)).to.eq(
      TEST_AMOUNT
    );
  });

  it('transfer', async () => {
    await expect(token.transfer(other.address, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(wallet.address, other.address, TEST_AMOUNT);
    expect(await token.balanceOf(wallet.address)).to.eq(
      TOTAL_SUPPLY.sub(TEST_AMOUNT)
    );
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT);
  });

  it('transfer:fail', async () => {
    await expect(token.transfer(other.address, TOTAL_SUPPLY.add(1))).to.be
      .reverted; // ds-math-sub-underflow
    await expect(token.connect(other).transfer(wallet.address, 1)).to.be
      .reverted; // ds-math-sub-underflow
  });

  it('transferFrom', async () => {
    await token.approve(other.address, TEST_AMOUNT);
    await expect(
      token
        .connect(other)
        .transferFrom(wallet.address, other.address, TEST_AMOUNT)
    )
      .to.emit(token, 'Transfer')
      .withArgs(wallet.address, other.address, TEST_AMOUNT);
    expect(await token.allowance(wallet.address, other.address)).to.eq(0);
    expect(await token.balanceOf(wallet.address)).to.eq(
      TOTAL_SUPPLY.sub(TEST_AMOUNT)
    );
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT);
  });

  it('transferFrom:max', async () => {
    await token.approve(other.address, MaxUint256);
    await expect(
      token
        .connect(other)
        .transferFrom(wallet.address, other.address, TEST_AMOUNT)
    )
      .to.emit(token, 'Transfer')
      .withArgs(wallet.address, other.address, TEST_AMOUNT);
    expect(await token.allowance(wallet.address, other.address)).to.eq(
      MaxUint256
    );
    expect(await token.balanceOf(wallet.address)).to.eq(
      TOTAL_SUPPLY.sub(TEST_AMOUNT)
    );
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT);
  });

  it('permit', async () => {
    const nonce = await token.nonces(wallet.address);
    const deadline = MaxUint256;
    const digest = await getApprovalDigest(
      token,
      { owner: wallet.address, spender: other.address, value: TEST_AMOUNT },
      nonce,
      deadline,
      chainId
    );

    const { v, r, s } = ecsign(
      Buffer.from(digest.slice(2), 'hex'),
      Buffer.from(pk.slice(2), 'hex')
    );

    expect(
      await token.permit(
        wallet.address,
        other.address,
        TEST_AMOUNT,
        deadline,
        v,
        hexlify(r),
        hexlify(s)
      )
    )
      .to.emit(token, 'Approval')
      .withArgs(wallet.address, other.address, TEST_AMOUNT);
    expect(await token.allowance(wallet.address, other.address)).to.eq(
      TEST_AMOUNT
    );
    expect(await token.nonces(wallet.address)).to.eq(BigNumber.from(1));
  });
});

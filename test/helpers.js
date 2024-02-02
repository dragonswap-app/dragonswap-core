const { ethers, web3 } = require('hardhat');
const { toUtf8Bytes, getAddress } = require('ethers').utils;
const { BigNumber } = require('ethers');

const currentTimestamp = async () => {
  return (await ethers.provider.getBlock('latest')).timestamp;
};

const timeTravel = async (t) => {
  await ethers.provider.send('evm_increaseTime', [t]);
};

const mineBlock = async (n) => {
  await ethers.provider.send('evm_mine', [n]);
};

const PERMIT_TYPEHASH = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes(
    'Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'
  )
);

function expandTo18Decimals(n) {
  return ethers.BigNumber.from(n).mul(ethers.BigNumber.from(10).pow(18));
}

async function getApprovalDigest(token, approve, nonce, deadline, chainId) {
  const name = await token.name();
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address, chainId);
  return ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            [
              PERMIT_TYPEHASH,
              approve.owner,
              approve.spender,
              approve.value,
              nonce,
              deadline,
            ]
          )
        ),
      ]
    )
  );
}

function getCreate2Address(factoryAddress, [tokenA, tokenB], bytecode) {
  const [token0, token1] =
    tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA];
  const create2Inputs = [
    '0xff',
    factoryAddress,
    ethers.utils.keccak256(
      ethers.utils.solidityPack(['address', 'address'], [token0, token1])
    ),
    ethers.utils.keccak256(bytecode),
  ];
  const sanitizedInputs = `0x${create2Inputs.map((i) => i.slice(2)).join('')}`;
  return getAddress(`0x${ethers.utils.keccak256(sanitizedInputs).slice(-40)}`);
}

function getDomainSeparator(name, tokenAddress, chainId) {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        ethers.utils.keccak256(
          toUtf8Bytes(
            'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
          )
        ),
        ethers.utils.keccak256(toUtf8Bytes(name)),
        ethers.utils.keccak256(toUtf8Bytes('1')),
        chainId,
        tokenAddress,
      ]
    )
  );
}

function getParamFromTxEvent(
  transaction,
  paramName,
  contractFactory,
  eventName
) {
  assert.isObject(transaction);
  let logs = transaction.logs;
  if (eventName != null) {
    logs = logs.filter((l) => l.event === eventName);
  }
  assert.equal(logs.length, 1, 'too many logs found!');
  let param = logs[0].args[paramName];
  if (contractFactory != null) {
    let contract = contractFactory.at(param);
    assert.isObject(contract, `getting ${paramName} failed for ${param}`);
    return contract;
  } else {
    return param;
  }
}

function balanceOf(account) {
  return new Promise((resolve, reject) =>
    web3.eth.getBalance(account, (e, balance) =>
      e ? reject(e) : resolve(balance)
    )
  );
}

function encodePrice(reserve0, reserve1) {
  return [
    reserve1.mul(BigNumber.from(2).pow(112)).div(reserve0),
    reserve0.mul(BigNumber.from(2).pow(112)).div(reserve1),
  ];
}

module.exports = {
  currentTimestamp,
  timeTravel,
  mineBlock,
  getParamFromTxEvent,
  balanceOf,
  encodePrice,
  expandTo18Decimals,
  getApprovalDigest,
  getCreate2Address,
};

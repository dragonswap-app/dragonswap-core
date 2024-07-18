require('dotenv').config();
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-waffle');
require('solidity-coverage');
require('hardhat-gas-reporter');
require('hardhat-contract-sizer');

const accounts = process.env.PK ? [process.env.PK] : [];
const timeout = 50000;

module.exports = {
  networks: {
    mainnet: {
      url: 'to be added',
      chainId: 0,
      timeout,
      accounts,
    },
    testnet: {
      url: "https://evm-rpc-testnet.sei-apis.com",
      chainId: 1328,
      timeout,
      accounts,
    },
    local: {
      url: 'http://localhost:8545',
    },
    hardhat: {
      evmVersion: 'istanbul',
    },
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: true,
  },
  gasReporter: {
    enabled: true,
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  solidity: {
    compilers: [
      {
        version: '0.5.16',
        settings: {
          evmVersion: 'istanbul',
          optimizer: {
            enabled: true,
            runs: 99999,
          },
        },
      },
      {
        version: '0.6.6',
        settings: {
          evmVersion: 'istanbul',
          optimizer: {
            enabled: true,
            runs: 99999,
          },
        },
      },
      {
        version: "0.8.20",
        settings: {
          evmVersion: 'paris',
          optimizer: {
            enabled: true,
            runs: 99999,
          },
        },
      }
    ],
  },
};

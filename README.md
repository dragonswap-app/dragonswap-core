# Dragonswap Decentralized Exchange on Sei | by NIMA  ![CI](https://github.com/NIMA-Enterprises/dragonswap-solidity/actions/workflows/ci.yml/badge.svg)

### Dependencies
- Make sure to use node version 16 or higher.
- to install do `$ yarn`

### Environment
 - Fill in the environment values as described with .env.example template inside the .env file (comand below)
---
## Usage
### Compile code
`$ yarn compile`

### Run tests
`$ yarn test`

### Run coverage
`$ yarn coverage`

### Run lint
`$ yarn lint`

### Format code
`$ yarn prettier`

### Compute bytecode size of each contract
`$ yarn size`

---
## Setup local node
### Setup hardhat node
`$ yarn node`

### Setup node forked from Sei Mainnet
`$ yarn node-mainnet`

### Setup node forked from Sei Testnet
`$ yarn node-testnet`

## CI
### Update abis manually
`$ node scripts/updateAbis.js`

---
## License
MIT

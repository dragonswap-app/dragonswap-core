# Dragonswap Decentralized Exchange on Sei | by NIMA  ![CI](https://github.com/dragonswap-app/dragonswap-core/actions/workflows/ci.yml/badge.svg)

### Install Dependencies
- `$ nvm use`
- `$ yarn install`

### Environment
 - Fill in the environment values as described with .env.example template inside the .env file
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

require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL
const RINKEBY_PRIVATE_KEY = process.env.RINKEBY_PRIVATE_KEY
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL
const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY

/*
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
*/

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  gasReporter: {
    coinmarketcap: COINMARKETCAP_API_KEY,
    currency: "USD",
    enabled: false,
    noColors: true,
    outputFile: "gas-report.txt",
    token: "MATIC",
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    },
  },
  networks: {
    goerli: {
      accounts: [GOERLI_PRIVATE_KEY],
      blockConfirmations: 6,
      chainId: 5,
      url: GOERLI_RPC_URL,
    },
    hardhat: {
      blockConfirmations: 1,
      chainId: 31337,
    },
    rinkeby: {
      accounts: [RINKEBY_PRIVATE_KEY],
      blockConfirmations: 6,
      chainId: 4,
      url: RINKEBY_RPC_URL,
    },
  },
  solidity: "0.8.8",
  mocha: {
    timeout: 200000, // 200 seconds max
  },
}

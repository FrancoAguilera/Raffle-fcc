require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const PRIVATE_KEY = process.env.PRIVATE_KEY
const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    defaultNetwork: "hardhat",
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player: {
            default: 1,
        },
    },
    networks: {
        hardhat: {
            blockConfirmations: 1,
            chainId: 31337,
        },
        rinkeby: {
            accounts: [PRIVATE_KEY],
            blockConfirmations: 6,
            chainId: 4,
            url: RINKEBY_RPC_URL,
        },
    },
    solidity: "0.8.8",
}

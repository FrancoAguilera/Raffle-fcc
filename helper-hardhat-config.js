const { ethers } = require("ethers")

const networkConfig = {
  5: {
    name: "goerli",
    subscriptionId: "6926",
    gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15", // 30 gwei
    keepersUpdateInterval: "30",
    raffleEntranceFee: ethers.utils.parseEther("0.01"), // 0.1 ETH
    callbackGasLimit: "500000", // 500,000 gas
    vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
  },
  31337: {
    name: "hardhat",
    raffleEntranceFee: ethers.utils.parseEther("0.01"), // 0.1 ETH
    gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15", // 30 gwei
    callbackGasLimit: "500000", // 500,000 gas
    keepersUpdateInterval: "30",
  },
  137: {
    name: "polygon",
    ethUsdPriceFeed: "0xF9680D99D6C9589e2a93a78A04A279e509205945",
  },
}

const DECIMALS = 8
const INITIAL_ANSWER = 200000000000

const developmentChains = ["hardhat", "localhost"]

module.exports = {
  networkConfig,
  developmentChains,
  DECIMALS,
  INITIAL_ANSWER,
}

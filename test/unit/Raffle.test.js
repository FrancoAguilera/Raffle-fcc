const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Test", async function () {
      let deployer
      let raffle
      let raffleContract
      let vrfCoordinatorV2Mock
      let raffleEntranceFee
      let interval
      const chainId = network.config.chainId

      beforeEach(async function () {
        await deployments.fixture(["all"])

        deployer = (await getNamedAccounts()).deployer
        raffle = await ethers.getContract("Raffle", deployer)
        raffleContract = await ethers.getContract("Raffle") // Returns a new connection to the Raffle contract
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
        raffleEntranceFee = await raffle.getEntranceFee()
        interval = await raffle.getInterval()
      })

      describe("Constructor", function () {
        it("Should initialize the raffle correctly", async function () {
          const raffleState = await raffle.getRaffleState()

          assert.equal(raffleState.toString(), "0")
          assert.equal(interval.toString(), networkConfig[chainId]["keepersUpdateInterval"])
        })
      })

      describe("Enter raffle", function () {
        it("SHould revert when you don't pay enough", async function () {
          await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughETHEntered")
        })

        it("Should record players when they enter", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee })
          const playerFromContract = await raffle.getPlayer(0)

          assert.equal(playerFromContract, deployer)
        })

        it("Should emit an event on enter", async function () {
          await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
            raffle,
            "RaffleEntered"
          )
        })

        it("Should not allow entrance on raffle calculating", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
          // we pretend to be Chainlink keeper
          await raffle.performUpkeep([])

          await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
            "Raffle__NotOpen"
          )
        })
      })

      describe("CheckUpkeep", function () {
        it("Should return false if people haven't sent any ETH", async function () {
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])

          assert(!upkeepNeeded)
        })
        it("should return false if raffle isn't open", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
          await raffle.performUpkeep("0x")

          const raffleState = await raffle.getRaffleState()
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])

          assert.equal(raffleState.toString(), "1")
          assert.equal(upkeepNeeded, false)
        })
        it("returns false if enough time hasn't passed", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
          await network.provider.request({ method: "evm_mine", params: [] })
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)

          assert(!upkeepNeeded)
        })
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.request({ method: "evm_mine", params: [] })
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)

          assert(upkeepNeeded)
        })
      })

      describe("performUpkeep", () => {
        it("should only run if checkUpkeep is true", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.request({ method: "evm_mine", params: [] })
          const tx = await raffle.performUpkeep([])

          assert(tx)
        })
        it("should revers when checkUpkeep is false", async () => {
          await expect(raffle.performUpkeep([])).to.be.revertedWith("Raffle__UpkeepNotNeeded")
        })
        it("should updates the raffle state, emits an event, and calls the vrf coordinator", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.request({ method: "evm_mine", params: [] })
          const txResponse = await raffle.performUpkeep([])
          const txReceipt = await txResponse.wait(1)
          const requestId = txReceipt.events[1].args.requestId
          const raffleState = await raffle.getRaffleState()

          assert(requestId.toNumber() > 0)
          assert(raffleState.toString() === "1")
        })
      })
      describe("fulfillRandomWords", () => {
        beforeEach(async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
        })

        it("should only be called after performUpkeep", async () => {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
          ).to.be.revertedWith("nonexistent request")
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
          ).to.be.revertedWith("nonexistent request")
        })

        // This test is too big...
        // This test simulates users entering the raffle and wraps the entire functionality of the raffle
        // inside a promise that will resolve if everything is successful.
        // An event listener for the WinnerPicked is set up
        // Mocks of chainlink keepers and vrf coordinator are used to kickoff this winnerPicked event
        // All the assertions are done once the WinnerPicked event is fired
        it("picks a winner, resets, and sends money", async () => {
          const additionalEntrances = 3 // to test
          const startingIndex = 2
          const accounts = await ethers.getSigners()
          for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
            raffle = raffleContract.connect(accounts[i])
            await raffle.enterRaffle({ value: raffleEntranceFee })
          }
          const startingTimeStamp = await raffle.getLatestTimestamp()

          await new Promise(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!")
              try {
                const recentWinner = await raffle.getRecentWinner()
                const raffleState = await raffle.getRaffleState()
                const winnerBalance = await accounts[2].getBalance()
                const endingTimeStamp = await raffle.getLatestTimestamp()
                await expect(raffle.getPlayer(0)).to.be.reverted

                assert.equal(recentWinner.toString(), accounts[2].address)
                assert.equal(raffleState, 0)
                assert.equal(
                  winnerBalance.toString(),
                  startingBalance
                    .add(raffleEntranceFee.mul(additionalEntrances).add(raffleEntranceFee))
                    .toString()
                )
                assert(endingTimeStamp > startingTimeStamp)
                resolve()
              } catch (e) {
                reject(e)
              }
            })

            // kicking off the event by mocking the chainlink keepers and vrf coordinator
            const tx = await raffle.performUpkeep("0x")
            const txReceipt = await tx.wait(1)
            const startingBalance = await accounts[2].getBalance()
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txReceipt.events[1].args.requestId,
              raffle.address
            )
          })
        })
      })
    })

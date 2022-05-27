const { ethers } = require("hardhat");

async function main() {
  const [executor, proposer, voter1, voter2, voter3, voter4, voter5] = await ethers.getSigners();

  // We get all the contracts to deploy
  const Token = await ethers.getContractFactory("Token");
  const Governance = await ethers.getContractFactory("Governance");
  const Treasury = await ethers.getContractFactory("Treasury");
  const Timelock = await ethers.getContractFactory("TimeLock");

  // Deploy governance token
  console.log("Deploying governance token...")
  const token = await Token.deploy("Governor Token", "GOV", ethers.utils.parseEther("1000"));
  await token.deployed();
  console.log(`Token deployed at ${token.address}`)

  const amount = ethers.utils.parseEther("50")
  await token.transfer(voter1.address, amount)
  await token.transfer(voter2.address, amount)
  await token.transfer(voter3.address, amount)
  await token.transfer(voter4.address, amount)
  await token.transfer(voter5.address, amount)
  console.log("Sent 50 tokens to all voters")

  // Deploy timelock
  const delay = 0
  const timelock = await Timelock.deploy(delay, [proposer.address], [executor.address])
  await timelock.deployed()
  console.log(`Timelock deployed at ${timelock.address}`)
  console.log(`Deployed timelock with proposer ${proposer.address} and executor ${executor.address}`)

  // Deploy governance
  console.log("Deploying governance contract...")
  const quorum = 5 // 5% of total supply of tokens needed to approve proposal
  const votingDelay = 0 // voting starts after 0 blocks after proposal
  const votingPeriod = 5 // 5 blocks allow voters to vote
  const governance = await Governance.deploy(
    token.address, timelock.address, quorum, votingDelay, votingPeriod
  )
  await governance.deployed()
  console.log(`Governance deployed at ${governance.address}`)

  // Deploy treasury
  console.log("Deploying treasury...")
  const treasury = await Treasury.deploy(executor.address, { value: ethers.utils.parseEther("25") })
  await treasury.deployed()
  console.log(`Treasury deployed at ${treasury.address}`)

  await treasury.transferOwnership(timelock.address)
  console.log("Ownership trasnferred to timelock!")

  // Assign roles
  const proposerRole = await timelock.PROPOSER_ROLE()
  const executorRole = await timelock.EXECUTOR_ROLE()

  await timelock.grantRole(proposerRole, governance.address)
  await timelock.grantRole(executorRole, governance.address)
  console.log("Granted roles!")
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

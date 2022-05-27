const { ethers, waffle } = require("hardhat");

async function main() {
    const [executor, proposer, voter1, voter2, voter3, voter4, voter5] = await ethers.getSigners();

    const provider = waffle.provider

    let token_address = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    let governance_address = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"
    let treasury_address = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"
    let isReleased, funds, blockNumber, proposalState, vote

    const amount = ethers.utils.parseEther('5')

    const token = await ethers.getContractAt("Token", token_address,executor)
    await token.connect(voter1).delegate(voter1.address)
    await token.connect(voter2).delegate(voter2.address)
    await token.connect(voter3).delegate(voter3.address)
    await token.connect(voter4).delegate(voter4.address)
    await token.connect(voter5).delegate(voter5.address)

    const treasury = await ethers.getContractAt("Treasury", treasury_address, executor)
    isReleased = await treasury.isReleased()
    console.log(`Funds released? ${isReleased}`)

    funds = await provider.getBalance(treasury.address)
    console.log(`Funds inside of treasury: ${ethers.utils.formatEther(funds.toString())} ETH\n`)

    const governance = await ethers.getContractAt("Governance", governance_address, executor)
    // const encodedFunction = await treasury.contract.methods.releaseFunds().encodeABI()
    const encodedFunction = treasury.interface.encodeFunctionData("releaseFunds",[])
    const description = "Release Funds from Treasury"

    const tx = await governance.connect(proposer).propose([treasury.address], [0], [encodedFunction], description)
    const receipt = await tx.wait(1)
    const id = receipt.events[0].args.proposalId
    console.log(`Created Proposal: ${id.toString()}\n`)

    proposalState = await governance.state(id)
    console.log(`Current state of proposal: ${proposalState.toString()} (Pending) \n`)

    const snapshot = await governance.proposalSnapshot(id)
    console.log(`Proposal created on block ${snapshot.toString()}`)

    const deadline = await governance.proposalDeadline(id)
    console.log(`Proposal deadline on block ${deadline.toString()}\n`)

    blockNumber = await provider.getBlockNumber()
    console.log(`Current blocknumber: ${blockNumber}\n`)

    const quorum = await governance.quorum(blockNumber - 1)
    console.log(`Number of votes required to pass: ${ethers.utils.formatEther(quorum.toString())}\n`)

    // Vote
    console.log(`Casting votes...\n`)

    // 0 = Against, 1 = For, 2 = Abstain
    vote = await governance.connect(voter1).castVote(id, 1)
    vote = await governance.connect(voter2).castVote(id, 1)
    vote = await governance.connect(voter3).castVote(id, 1)
    vote = await governance.connect(voter4).castVote(id, 0)
    vote = await governance.connect(voter5).castVote(id, 2)

    // vote = await governance.castVote(id, 1, { from: voter1 })

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    proposalState = await governance.state(id)
    console.log(`Current state of proposal: ${proposalState.toString()} (Active) \n`)

    // NOTE: Transfer serves no purposes, it's just used to fast foward one block after the voting period ends
    await token.transfer(proposer.address, amount)

    const { againstVotes, forVotes, abstainVotes } = await governance.proposalVotes(id)
    console.log(`Votes For: ${ethers.utils.formatEther(forVotes.toString())}`)
    console.log(`Votes Against: ${ethers.utils.formatEther(againstVotes.toString())}`)
    console.log(`Votes Neutral: ${ethers.utils.formatEther(abstainVotes.toString())}\n`)

    blockNumber = await provider.getBlockNumber()
    console.log(`Current blocknumber: ${blockNumber}\n`)

    proposalState = await governance.state(id)
    console.log(`Current state of proposal: ${proposalState.toString()} (Succeeded) \n`)

    // Queue 
    const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Release Funds from Treasury"))
    await governance.queue([treasury.address], [0], [encodedFunction], hash)

    proposalState = await governance.state(id)
    console.log(`Current state of proposal: ${proposalState.toString()} (Queued) \n`)

    // Execute
    await governance.execute([treasury.address], [0], [encodedFunction], hash)

    proposalState = await governance.state(id)
    console.log(`Current state of proposal: ${proposalState.toString()} (Executed) \n`)

    isReleased = await treasury.isReleased()
    console.log(`Funds released? ${isReleased}`)

    funds = await provider.getBalance(treasury.address)
    console.log(`Funds inside of treasury: ${ethers.utils.formatEther(funds.toString())} ETH\n`)
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

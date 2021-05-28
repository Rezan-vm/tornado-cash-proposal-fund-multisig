// import "@nomiclabs/hardhat-waffle";
import { Contract } from "@ethersproject/contracts";
import { expect } from "chai";
import { ethers } from "hardhat";

import { getSignerFromAddress, advanceTime, takeSnapshot, restoreSnapshot } from "./helpers";
import governanceAbi from "../abi/governance.json";
import Torn from "../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json";

describe("TCashProposal", function () {
  // Live TORN contract
  const tornToken = "0x77777FeDdddFfC19Ff86DB637967013e6C6A116C";
  // Live governance contract
  const governanceAddress = "0x5efda50f22d34F262c29268506C5Fa42cB56A1Ce";
  // TORN whale to vote with 25k votes to pass the vote
  const tornWhale = "0x5f48c2a71b2cc96e3f0ccae4e39318ff0dc375b2";

  const torn25k = ethers.utils.parseEther("25000");
  let proposal: Contract;
  let torn: Contract;
  let snapshotId: string;

  // Will deploy, pass and execute the proposal
  before(async () => {
    const Proposal = await ethers.getContractFactory("TCashProposal");
    proposal = await Proposal.deploy();
    await proposal.deployed();

    // Get Tornado governance contract
    let governance = await ethers.getContractAt(governanceAbi, governanceAddress);

    // Get TORN token contract
    torn = await ethers.getContractAt(Torn.abi, tornToken);

    // Impersonate a TORN address with more than 25k tokens
    const tornWhaleSigner = await getSignerFromAddress(tornWhale);
    torn = torn.connect(tornWhaleSigner);
    governance = governance.connect(tornWhaleSigner);

    // Lock 25k TORN in governance
    await torn.approve(governance.address, torn25k);
    await governance.lockWithApproval(torn25k);

    // Propose
    await governance.propose(proposal.address, "Transfer tokens to multisig");
    const proposalId = await governance.proposalCount();

    // Wait the voting delay and vote for the proposal
    await advanceTime((await governance.VOTING_DELAY()).toNumber() + 1);
    await governance.castVote(proposalId, true);

    // Wait voting period + execution delay
    await advanceTime((await governance.VOTING_PERIOD()).toNumber() + (await governance.EXECUTION_DELAY()).toNumber());

    // Execute the proposal
    const receipt = await governance.execute(proposalId);
    await receipt.wait();

    // Take a snapshot the reset the sate after each test
    snapshotId = await takeSnapshot();
  });

  it("Proposal should work", async function () {
    
    // ######

    // Check the result of the proposal here!
    expect(await torn.balanceOf("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")).gte(ethers.utils.parseEther("10"));

    // ######
  });

  afterEach(async () => {
    // Reset the state
    await restoreSnapshot(snapshotId);
    snapshotId = await takeSnapshot();
  });
});

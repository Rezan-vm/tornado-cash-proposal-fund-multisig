// import "@nomiclabs/hardhat-waffle";
import { Contract } from "@ethersproject/contracts";
import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { getSignerFromAddress, advanceTime } from "./helpers";
import governanceAbi from "../abi/governance.json";
import governanceVestingAbi from "../abi/governance-vesting.json";
import sablierAbi from "../abi/sablier.json";
import Torn from "../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json";
import { BigNumber } from "@ethersproject/bignumber";

describe("TCashProposal", function () {
  // Live TORN contract
  const tornToken = "0x77777FeDdddFfC19Ff86DB637967013e6C6A116C";
  // Live governance contract
  const governanceAddress = "0x5efda50f22d34F262c29268506C5Fa42cB56A1Ce";
  // TORN whale to vote with 25k votes to pass the vote
  const tornWhaleAddress = "0x5f48c2a71b2cc96e3f0ccae4e39318ff0dc375b2";

  const communityMultisigAddress = "0xb04E030140b30C27bcdfaafFFA98C57d80eDa7B4";

  const governanceVestingAddress = "0x179f48C78f57A3A78f0608cC9197B8972921d1D2";

  const sablierAddress = "0xA4fc358455Febe425536fd1878bE67FfDBDEC59a";

  const torn25k = ethers.utils.parseEther("25000");
  const secondPerYear = 30 * 12 * 24 * 3600;

  let proposal: Contract;
  let torn: Contract;
  let snapshotId: string;
  it("Proposal should work", async function () {

    // === deploy and pass proposal  ===

    const Proposal = await ethers.getContractFactory("TCashProposal");
    proposal = await Proposal.deploy();
    await proposal.deployed();

    // Get Tornado governance contract
    let governance = await ethers.getContractAt(governanceAbi, governanceAddress);

    // Get TORN token contract
    torn = await ethers.getContractAt(Torn.abi, tornToken);

    // Impersonate a TORN address with more than 25k tokens
    const tornWhaleSigner = await getSignerFromAddress(tornWhaleAddress);
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
    await advanceTime(
      (await governance.VOTING_PERIOD()).toNumber() + (await governance.EXECUTION_DELAY()).toNumber()
    );

    // Execute the proposal
    const pending = await governance.execute(proposalId);
    const receipt = await pending.wait();

    // === Verify proposal ===

    let sablier = new Contract(sablierAddress, sablierAbi).connect(waffle.provider);
    const governanceVesting = new Contract(governanceVestingAddress, governanceVestingAbi).connect(
      waffle.provider
    );

    const multisigBalance = await torn.balanceOf(communityMultisigAddress);
    expect(multisigBalance).eq((await governanceVesting.released()).mul(5).div(100));

    console.log(`Multisig balance after proposal: ${ethers.utils.formatEther(multisigBalance)} TORN`);
    
    // Check the stream
    const sablierLog = receipt.logs.find((x) => x.address === sablierAddress);
    const streamId = BigNumber.from(sablierLog.topics[1]).toNumber();
    const stream = await sablier.getStream(streamId);
    
    expect(stream.sender).eq(governance.address);
    expect(stream.recipient).eq(communityMultisigAddress);
    expect(stream.tokenAddress).eq(torn.address);

    const now = (await waffle.provider.getBlock("latest")).timestamp;
    expect(stream.startTime).eq(now);
    expect(stream.stopTime).eq(now + secondPerYear);
    expect(stream.remainingBalance).eq(stream.deposit);

    const sablierDeposit = stream.deposit;

    // 5% of the tokens vesting in the next year: 5.5m TORN / 5 year * 5%
    const streamedAmount = ethers.utils.parseEther("5500000").div(5).mul(5).div(100);
    const adjustedStreamedAmount = streamedAmount.sub(
      streamedAmount.mod(secondPerYear)
    );
    expect(sablierDeposit).eq(adjustedStreamedAmount);

    console.log(`Tokens in sablier stream: ${ethers.utils.formatEther(sablierDeposit)} TORN`);

    // Wait 6 months and claim the stream
    await advanceTime(secondPerYear / 2);
    sablier = sablier.connect(await getSignerFromAddress(communityMultisigAddress));
    await sablier.withdrawFromStream(streamId, adjustedStreamedAmount.div(2));
    const multisigBalanceAfter6Months = await torn.balanceOf(communityMultisigAddress);
    expect(multisigBalanceAfter6Months).eq(multisigBalance.add(adjustedStreamedAmount.div(2)))

    console.log(`Multisig balance after 6 months: ${ethers.utils.formatEther(multisigBalanceAfter6Months)} TORN`);

    // Wait 6 month and claim the rest
    await advanceTime(secondPerYear / 2);
    await sablier.withdrawFromStream(streamId, adjustedStreamedAmount.div(2));
    const multisigBalanceAfter1Year = await torn.balanceOf(communityMultisigAddress);
    expect(multisigBalanceAfter1Year).eq(multisigBalance.add(adjustedStreamedAmount))

    console.log(`Multisig balance after 1 year: ${ethers.utils.formatEther(multisigBalanceAfter1Year)} TORN`);
    
    // Check that the stream was emptied and deleted from storage
    expect(sablier.getStream(streamId)).revertedWith("stream does not exist");    
  });
});

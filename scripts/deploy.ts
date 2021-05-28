import "@nomiclabs/hardhat-waffle";
import { ethers } from "hardhat";

const main = async () => {
  const Proposal = await ethers.getContractFactory(
    "TCashProposal"
  );
  console.log("Deploying...")
  // const proposal = await Proposal.deploy({ gasPrice: process.env.GASP_PRICE });
  const tx = Proposal.getDeployTransaction()
  const signer = (await ethers.getSigners())[0]

  const pending = await signer.sendTransaction(tx)
  console.log(`Transaction sent: ${pending.hash}`)
  console.log("Wait for confirmation...")
  const receipt = await pending.wait()
  console.log(`Deployed to: ${receipt.contractAddress}`);
};

main();

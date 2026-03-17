import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const network = await ethers.provider.getNetwork();
  const deploymentPath = path.join(__dirname, "..", "deployments", "syscoinTestnet.json");

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found at ${deploymentPath}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const [deployer] = await ethers.getSigners();

  console.log("Demo Deposit Script");
  console.log("====================");
  console.log(`Contract: ${deployment.address}`);
  console.log(`Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} tSYS`);

  const contract = await ethers.getContractAt("EscrowCampaign", deployment.contractAddress);

  // Campaign ID from the database
  const campaignId = process.env.DEMO_CAMPAIGN_ID || "cmmu3pert0000m2ukumyuea0z";
  const campaignIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(campaignId));
  const costPerConversion = ethers.parseEther("0.5"); // 0.5 tSYS per conversion
  const depositAmount = ethers.parseEther("2"); // 2 tSYS total deposit

  console.log(`\nDepositing 2 tSYS for campaign: ${campaignId}`);
  console.log(`Campaign hash: ${campaignIdBytes32}`);
  console.log(`Cost per conversion: 0.5 tSYS`);

  const tx = await contract.deposit(campaignIdBytes32, costPerConversion, {
    value: depositAmount,
  });

  console.log(`\nTx sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Tx confirmed in block: ${receipt!.blockNumber}`);

  // Verify campaign on-chain
  const campaign = await contract.campaigns(campaignIdBytes32);
  console.log(`\nOn-chain campaign state:`);
  console.log(`  Balance: ${ethers.formatEther(campaign.balance)} tSYS`);
  console.log(`  Cost/conversion: ${ethers.formatEther(campaign.costPerConversion)} tSYS`);
  console.log(`  Conversions: ${campaign.conversionsCount}`);
  console.log(`  Active: ${campaign.active}`);

  console.log(`\n✅ Deposit complete! View on explorer:`);
  console.log(`https://tanenbaum.io/tx/${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

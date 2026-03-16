import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deploymentPath = path.join(__dirname, `../deployments/${network.name}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found for network: ${network.name}. Deploy first.`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const contractAddress = deployment.contractAddress;

  const [signer] = await ethers.getSigners();
  console.log(`\nSetting platform fee on ${network.name}`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Signer:   ${signer.address}\n`);

  const EscrowCampaign = await ethers.getContractAt("EscrowCampaign", contractAddress, signer);

  const newFeeBps = 800; // 8%
  const currentFee = await EscrowCampaign.platformFeeBps();
  console.log(`Current fee: ${currentFee} bps (${Number(currentFee) / 100}%)`);
  console.log(`New fee:     ${newFeeBps} bps (${newFeeBps / 100}%)`);

  const tx = await EscrowCampaign.setPlatformFee(newFeeBps);
  const receipt = await tx.wait();
  console.log(`\n✅ Platform fee updated. Tx: ${receipt.hash}`);

  // Update deployment info
  deployment.platformFeeBps = newFeeBps;
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`📄 Deployment info updated`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

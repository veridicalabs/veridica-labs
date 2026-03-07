import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`\nDeploying EscrowCampaign on network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // ── Constructor args ────────────────────────────────────────────────────────
  // VERIFIER_ADDRESS: backend oracle hot wallet that calls registerConversion()
  const verifierAddress = process.env.VERIFIER_ADDRESS || deployer.address;
  // TREASURY_ADDRESS: receives platform fees
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  // PLATFORM_FEE_BPS: fee in basis points (200 = 2%)
  const platformFeeBps = Number(process.env.PLATFORM_FEE_BPS ?? "200");

  console.log(`Verifier:       ${verifierAddress}`);
  console.log(`Treasury:       ${treasuryAddress}`);
  console.log(`Platform fee:   ${platformFeeBps} bps (${platformFeeBps / 100}%)\n`);

  // ── Deploy ──────────────────────────────────────────────────────────────────
  const EscrowCampaign = await ethers.getContractFactory("EscrowCampaign");
  const escrow = await EscrowCampaign.deploy(verifierAddress, treasuryAddress, platformFeeBps);
  await escrow.waitForDeployment();

  const contractAddress = await escrow.getAddress();
  console.log(`✅ EscrowCampaign deployed to: ${contractAddress}`);

  // ── Persist deployment info ─────────────────────────────────────────────────
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    contractAddress,
    verifier: verifierAddress,
    treasury: treasuryAddress,
    platformFeeBps,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    txHash: escrow.deploymentTransaction()?.hash ?? "",
  };

  const filePath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${filePath}`);
  console.log(`\nAdd to your .env:\nESCROW_CONTRACT_ADDRESS=${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

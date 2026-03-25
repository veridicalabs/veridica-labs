import { Wallet } from "zksync-ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import * as fs from "fs";
import * as path from "path";

export default async function (hre: HardhatRuntimeEnvironment) {
  const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
  if (!DEPLOYER_KEY) throw new Error("DEPLOYER_PRIVATE_KEY not set");

  const wallet = new Wallet(DEPLOYER_KEY);
  const deployer = new Deployer(hre, wallet);

  console.log(`\nDeploying EscrowCampaign on zkSYS Testnet`);
  console.log(`Deployer: ${wallet.address}`);

  const artifact = await deployer.loadArtifact("EscrowCampaign");

  const verifierAddress = process.env.VERIFIER_ADDRESS || wallet.address;
  const treasuryAddress = process.env.TREASURY_ADDRESS || wallet.address;

  console.log(`Verifier: ${verifierAddress}`);
  console.log(`Treasury: ${treasuryAddress}`);

  const contract = await deployer.deploy(artifact, [verifierAddress, treasuryAddress]);
  const contractAddress = await contract.getAddress();

  console.log(`\n✅ EscrowCampaign deployed to: ${contractAddress}`);

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentInfo = {
    network: "zkSysTestnet",
    chainId: 57057,
    contractAddress,
    verifier: verifierAddress,
    treasury: treasuryAddress,
    feeTiers: "1-10: 10%, 11-30: 8%, 31+: 6%",
    deployer: wallet.address,
    deployedAt: new Date().toISOString(),
  };

  const filePath = path.join(deploymentsDir, "zkSysTestnet.json");
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${filePath}`);
  console.log(`\nAdd to your .env:\nESCROW_CONTRACT_ADDRESS=${contractAddress}`);
}

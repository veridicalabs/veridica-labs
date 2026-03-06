import { ethers } from "hardhat";

async function main() {
  const EscrowCampaign = await ethers.getContractFactory("EscrowCampaign");
  const escrow = await EscrowCampaign.deploy();
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log(`EscrowCampaign deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

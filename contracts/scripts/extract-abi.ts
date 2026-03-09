import * as fs from "fs";
import * as path from "path";

const artifactPath = path.join(
  __dirname,
  "../artifacts/contracts/EscrowCampaign.sol/EscrowCampaign.json"
);
const outputPath = path.join(__dirname, "../../backend/src/contracts/EscrowCampaign.abi.json");

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

const abiData = {
  contractName: artifact.contractName,
  abi: artifact.abi,
  bytecode: artifact.bytecode,
};

const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(abiData, null, 2));

console.log(`✅ ABI extracted to: ${outputPath}`);

import { ethers } from "ethers";

export const ESCROW_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS ||
  "0x8b9e3655f7bf437E775280db41649AB2b9eF0E0e";

export const ZKSYS_CHAIN_ID = 57057;
export const ZKSYS_CHAIN_CONFIG = {
  chainId: "0xdeF1", // 57057
  chainName: "zkTanenbaum Testnet",
  rpcUrls: ["https://rpc-zk.tanenbaum.io"],
  blockExplorerUrls: ["https://explorer-zk.tanenbaum.io"],
  nativeCurrency: { name: "tSYS", symbol: "tSYS", decimals: 18 },
};

// Minimal ABI for deposit function
export const ESCROW_ABI = [
  "function deposit(bytes32 campaignId, uint256 costPerConversion) external payable",
  "function getCampaign(bytes32 campaignId) external view returns (tuple(address advertiser, uint256 balance, uint256 totalDeposited, uint256 totalReleased, uint256 costPerConversion, uint256 conversionsCount, bool active))",
  "function refund(bytes32 campaignId) external",
];

export function campaignIdToBytes32(id: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(id));
}

export async function connectWallet(): Promise<ethers.BrowserProvider | null> {
  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    alert("MetaMask o Pali Wallet no detectado. Por favor instala una wallet compatible.");
    return null;
  }

  const provider = new ethers.BrowserProvider(ethereum);
  await provider.send("eth_requestAccounts", []);

  // Switch to zkSYS network
  try {
    await provider.send("wallet_switchEthereumChain", [
      { chainId: ZKSYS_CHAIN_CONFIG.chainId },
    ]);
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      await provider.send("wallet_addEthereumChain", [ZKSYS_CHAIN_CONFIG]);
    }
  }

  return provider;
}

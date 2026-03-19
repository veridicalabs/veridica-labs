import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY
  ? [process.env.DEPLOYER_PRIVATE_KEY]
  : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Syscoin NEVM Mainnet (chainId: 57)
    syscoin: {
      url: process.env.RPC_URL || "https://rpc.syscoin.org",
      chainId: 57,
      accounts: DEPLOYER_KEY,
    },
    // Syscoin NEVM Testnet — Tanenbaum (chainId: 5700)
    syscoinTestnet: {
      url: process.env.RPC_URL_TESTNET || "https://rpc.tanenbaum.io",
      chainId: 5700,
      accounts: DEPLOYER_KEY,
    },
    // Rollux Testnet — Syscoin L2 / zkSYS (chainId: 57000)
    rolluxTestnet: {
      url: process.env.RPC_URL_ROLLUX_TESTNET || "https://57000.rpc.thirdweb.com",
      chainId: 57000,
      accounts: DEPLOYER_KEY,
    },
  },
  etherscan: {
    apiKey: {
      syscoin: process.env.SYSCOIN_EXPLORER_API_KEY || "no-key",
      syscoinTestnet: process.env.SYSCOIN_EXPLORER_API_KEY || "no-key",
    },
    customChains: [
      {
        network: "syscoin",
        chainId: 57,
        urls: {
          apiURL: "https://explorer.syscoin.org/api",
          browserURL: "https://explorer.syscoin.org",
        },
      },
      {
        network: "syscoinTestnet",
        chainId: 5700,
        urls: {
          apiURL: "https://tanenbaum.io/api",
          browserURL: "https://tanenbaum.io",
        },
      },
      {
        network: "rolluxTestnet",
        chainId: 57000,
        urls: {
          apiURL: "https://rollux.tanenbaum.io/api",
          browserURL: "https://rollux.tanenbaum.io",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;

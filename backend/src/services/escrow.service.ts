import { ethers } from "ethers";
import { prisma } from "../db/prisma";
import EscrowABI from "../contracts/EscrowCampaign.abi.json";

/**
 * Escrow Service — Syscoin NEVM Integration
 *
 * Connects to the deployed EscrowCampaign contract on Syscoin NEVM.
 * Handles deposit, registerConversion, releasePayment, and refund operations.
 */
export class EscrowService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private verifierWallet: ethers.Wallet;

  constructor() {
    const rpcUrl = process.env.RPC_URL_TESTNET || "https://rpc.tanenbaum.io";
    const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS;
    const verifierKey = process.env.VERIFIER_PRIVATE_KEY;

    if (!contractAddress) {
      throw new Error("ESCROW_CONTRACT_ADDRESS not set in .env");
    }
    if (!verifierKey) {
      throw new Error("VERIFIER_PRIVATE_KEY not set in .env");
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.verifierWallet = new ethers.Wallet(verifierKey, this.provider);
    this.contract = new ethers.Contract(contractAddress, EscrowABI.abi, this.verifierWallet);
  }

  /**
   * PYME deposits campaign budget into escrow contract.
   * Called from frontend when advertiser funds a campaign.
   */
  async depositBudget(campaignId: string, amountInEther: string, advertiserAddress: string) {
    try {
      const campaignIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(campaignId));
      const campaign = await prisma.campaign.findUniqueOrThrow({
        where: { id: campaignId },
      });

      const costPerConversion = ethers.parseEther(campaign.costPerConversion.toString());
      const value = ethers.parseEther(amountInEther);

      // Advertiser needs to call this from frontend with their wallet
      // Backend only tracks the transaction
      console.log(`[Escrow] Deposit initiated for campaign ${campaignId}`);
      console.log(`  Amount: ${amountInEther} SYS`);
      console.log(`  Cost per conversion: ${campaign.costPerConversion} SYS`);

      return {
        success: true,
        campaignIdBytes32,
        costPerConversion: costPerConversion.toString(),
        value: value.toString(),
        message: "Advertiser must call deposit() from frontend wallet",
      };
    } catch (error) {
      console.error("[Escrow] Deposit failed:", error);
      throw error;
    }
  }

  /**
   * Backend oracle registers a verified conversion on-chain.
   * This reserves funds from the campaign balance (net + fee).
   */
  async registerConversion(campaignId: string, conversionId: string, recipientAddress: string) {
    try {
      const campaignIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(campaignId));
      const conversionIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(conversionId));

      console.log(`[Escrow] Registering conversion on-chain...`);
      console.log(`  Campaign: ${campaignId}`);
      console.log(`  Conversion: ${conversionId}`);
      console.log(`  Recipient: ${recipientAddress}`);

      const tx = await this.contract.registerConversion(
        campaignIdBytes32,
        conversionIdBytes32,
        recipientAddress
      );

      const receipt = await tx.wait();
      console.log(`[Escrow] ✅ Conversion registered. Tx: ${receipt.hash}`);

      return {
        success: true,
        txHash: receipt.hash,
        conversionIdBytes32,
      };
    } catch (error) {
      console.error("[Escrow] registerConversion failed:", error);
      throw error;
    }
  }

  /**
   * Triggers on-chain payment release for a registered conversion.
   * Anyone can call this (trustless settlement).
   */
  async releasePayment(conversionId: string) {
    try {
      const conversionIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(conversionId));

      console.log(`[Escrow] Releasing payment for conversion ${conversionId}...`);

      const tx = await this.contract.releasePayment(conversionIdBytes32);
      const receipt = await tx.wait();

      console.log(`[Escrow] ✅ Payment released. Tx: ${receipt.hash}`);

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (error) {
      console.error("[Escrow] releasePayment failed:", error);
      throw error;
    }
  }

  /**
   * Advertiser refunds remaining (unreserved) campaign balance.
   * Must be called from advertiser's wallet (frontend).
   */
  async refund(campaignId: string) {
    try {
      const campaignIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(campaignId));

      console.log(`[Escrow] Refund must be called from advertiser wallet`);

      return {
        success: true,
        campaignIdBytes32,
        message: "Advertiser must call refund() from frontend wallet",
      };
    } catch (error) {
      console.error("[Escrow] Refund failed:", error);
      throw error;
    }
  }

  /**
   * Query campaign state from contract.
   */
  async getCampaign(campaignId: string) {
    try {
      const campaignIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(campaignId));
      const campaign = await this.contract.getCampaign(campaignIdBytes32);

      return {
        advertiser: campaign.advertiser,
        balance: ethers.formatEther(campaign.balance),
        totalDeposited: ethers.formatEther(campaign.totalDeposited),
        totalReleased: ethers.formatEther(campaign.totalReleased),
        costPerConversion: ethers.formatEther(campaign.costPerConversion),
        conversionsCount: campaign.conversionsCount.toString(),
        active: campaign.active,
      };
    } catch (error) {
      console.error("[Escrow] getCampaign failed:", error);
      throw error;
    }
  }

  /**
   * Query conversion state from contract.
   */
  async getConversion(conversionId: string) {
    try {
      const conversionIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(conversionId));
      const conversion = await this.contract.getConversion(conversionIdBytes32);

      return {
        campaignId: conversion.campaignId,
        recipient: conversion.recipient,
        netAmount: ethers.formatEther(conversion.netAmount),
        fee: ethers.formatEther(conversion.fee),
        released: conversion.released,
        registeredAt: new Date(Number(conversion.registeredAt) * 1000).toISOString(),
      };
    } catch (error) {
      console.error("[Escrow] getConversion failed:", error);
      throw error;
    }
  }
}

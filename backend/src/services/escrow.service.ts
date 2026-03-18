import { ethers } from "ethers";
import { prisma } from "../db/prisma";
import EscrowABI from "../contracts/EscrowCampaign.abi.json";

/**
 * Escrow Service — Syscoin NEVM Integration
 *
 * Connects to the deployed EscrowCampaign contract on Syscoin NEVM.
 * Handles deposit, registerConversion, releasePayment, and refund operations.
 * 
 * If ESCROW_CONTRACT_ADDRESS is not set, runs in MOCK mode for development.
 */
export class EscrowService {
  private provider: ethers.JsonRpcProvider | null = null;
  private contract: ethers.Contract | null = null;
  private verifierWallet: ethers.Wallet | null = null;
  private mockMode: boolean = false;

  constructor() {
    const rpcUrl = process.env.RPC_URL_TESTNET || "https://rpc.tanenbaum.io";
    const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS;
    const verifierKey = process.env.VERIFIER_PRIVATE_KEY;

    if (!contractAddress || !verifierKey) {
      console.log("[EscrowService] ⚠️ MOCK MODE - Contract not deployed or env vars missing");
      console.log("  ESCROW_CONTRACT_ADDRESS:", contractAddress ? "✅" : "❌ missing");
      console.log("  VERIFIER_PRIVATE_KEY:", verifierKey ? "✅" : "❌ missing");
      this.mockMode = true;
      return;
    }

    console.log("[EscrowService] ⛓️ Connecting to Syscoin NEVM...");
    console.log(`  RPC: ${rpcUrl}`);
    console.log(`  Contract: ${contractAddress}`);
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.verifierWallet = new ethers.Wallet(verifierKey, this.provider);
    this.contract = new ethers.Contract(contractAddress, EscrowABI.abi, this.verifierWallet);
    
    console.log("[EscrowService] ✅ Connected to contract");
  }

  /**
   * PYME deposits campaign budget into escrow contract.
   * Called from frontend when advertiser funds a campaign.
   */
  async depositBudget(campaignId: string, amountInEther: string | number, _advertiserAddress?: string) {
    const amount = amountInEther.toString();
    console.log(`[EscrowService] 💰 depositBudget()`);
    console.log(`  Campaign: ${campaignId}`);
    console.log(`  Amount: ${amount} tSYS`);

    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
    });

    if (this.mockMode) {
      console.log(`[EscrowService] 🎭 MOCK MODE - Simulating deposit`);
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { deposited: { increment: parseFloat(amount) } },
      });
      return { success: true, txHash: `0xMOCK_DEPOSIT_${Date.now().toString(16)}` };
    }

    try {
      const campaignIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(campaignId));
      const costPerConversion = ethers.parseEther(campaign.costPerConversion.toString());
      const value = ethers.parseEther(amount);

      console.log(`[EscrowService] 📤 Sending deposit tx...`);
      const tx = await this.contract!.deposit(campaignIdBytes32, costPerConversion, {
        value,
      });
      const receipt = await tx.wait();
      console.log(`[EscrowService] ✅ Deposited. Tx: ${receipt.hash}`);

      await prisma.campaign.update({
        where: { id: campaignId },
        data: { deposited: { increment: parseFloat(amount) } },
      });

      return { success: true, txHash: receipt.hash };
    } catch (error) {
      console.error("[EscrowService] ❌ deposit failed:", error);
      throw error;
    }
  }

  /**
   * Backend oracle registers a verified conversion on-chain.
   * This reserves funds from the campaign balance (net + fee).
   */
  async registerConversion(campaignId: string, conversionId: string, recipientAddress: string) {
    console.log(`[EscrowService] ⛓️ registerConversion()`);
    console.log(`  Campaign: ${campaignId}`);
    console.log(`  Conversion: ${conversionId}`);
    console.log(`  Recipient: ${recipientAddress}`);

    // Mock mode for development
    if (this.mockMode) {
      const mockTxHash = `0xMOCK_REGISTER_${Date.now().toString(16)}`;
      console.log(`[EscrowService] 🎭 MOCK MODE - Simulating registerConversion`);
      console.log(`[EscrowService] ✅ Mock TX: ${mockTxHash}`);
      return {
        success: true,
        txHash: mockTxHash,
        conversionIdBytes32: ethers.keccak256(ethers.toUtf8Bytes(conversionId)),
      };
    }

    try {
      const campaignIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(campaignId));
      const conversionIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(conversionId));

      console.log(`[EscrowService] 📤 Sending tx to contract...`);
      const tx = await this.contract!.registerConversion(
        campaignIdBytes32,
        conversionIdBytes32,
        recipientAddress
      );

      const receipt = await tx.wait();
      console.log(`[EscrowService] ✅ Conversion registered. Tx: ${receipt.hash}`);

      return {
        success: true,
        txHash: receipt.hash,
        conversionIdBytes32,
      };
    } catch (error) {
      console.error("[EscrowService] ❌ registerConversion failed:", error);
      throw error;
    }
  }

  /**
   * Triggers on-chain payment release for a registered conversion.
   * Anyone can call this (trustless settlement).
   */
  async releasePayment(conversionId: string) {
    console.log(`[EscrowService] 💸 releasePayment()`);
    console.log(`  Conversion: ${conversionId}`);

    // Mock mode for development
    if (this.mockMode) {
      const mockTxHash = `0xMOCK_RELEASE_${Date.now().toString(16)}`;
      console.log(`[EscrowService] 🎭 MOCK MODE - Simulating releasePayment`);
      console.log(`[EscrowService] ✅ Mock TX: ${mockTxHash}`);
      return {
        success: true,
        txHash: mockTxHash,
      };
    }

    try {
      const conversionIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(conversionId));

      console.log(`[EscrowService] 📤 Sending tx to contract...`);
      const tx = await this.contract!.releasePayment(conversionIdBytes32);
      const receipt = await tx.wait();

      console.log(`[EscrowService] ✅ Payment released. Tx: ${receipt.hash}`);

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (error) {
      console.error("[EscrowService] ❌ releasePayment failed:", error);
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
    console.log(`[EscrowService] 📊 getCampaign(${campaignId})`);

    if (this.mockMode) {
      console.log(`[EscrowService] 🎭 MOCK MODE - Returning mock campaign data`);
      return {
        advertiser: "0xMOCK_ADVERTISER",
        balance: "1.0",
        totalDeposited: "1.0",
        totalReleased: "0.0",
        costPerConversion: "0.1",
        conversionsCount: "0",
        active: true,
      };
    }

    try {
      const campaignIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(campaignId));
      const campaign = await this.contract!.getCampaign(campaignIdBytes32);

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
      console.error("[EscrowService] ❌ getCampaign failed:", error);
      throw error;
    }
  }

  /**
   * Query conversion state from contract.
   */
  async getConversion(conversionId: string) {
    console.log(`[EscrowService] 📊 getConversion(${conversionId})`);

    if (this.mockMode) {
      console.log(`[EscrowService] 🎭 MOCK MODE - Returning mock conversion data`);
      return {
        campaignId: "0xMOCK_CAMPAIGN_ID",
        recipient: "0xMOCK_RECIPIENT",
        netAmount: "0.098",
        fee: "0.002",
        released: true,
        registeredAt: new Date().toISOString(),
      };
    }

    try {
      const conversionIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(conversionId));
      const conversion = await this.contract!.getConversion(conversionIdBytes32);

      return {
        campaignId: conversion.campaignId,
        recipient: conversion.recipient,
        netAmount: ethers.formatEther(conversion.netAmount),
        fee: ethers.formatEther(conversion.fee),
        released: conversion.released,
        registeredAt: new Date(Number(conversion.registeredAt) * 1000).toISOString(),
      };
    } catch (error) {
      console.error("[EscrowService] ❌ getConversion failed:", error);
      throw error;
    }
  }
}

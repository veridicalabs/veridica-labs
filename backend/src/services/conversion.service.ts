import { prisma } from "../db/prisma";
import { EscrowService } from "./escrow.service";
import { AgentService } from "./agent.service";

const escrowService = new EscrowService();
const agentService = new AgentService();

export class ConversionService {
  /**
   * Registers a verified conversion:
   * 1. Fetches conversation messages
   * 2. Vera evaluates if conversion occurred (AI validation)
   * 3. Creates conversion record in DB
   * 4. Calls registerConversion() on-chain (reserves funds)
   * 5. Calls releasePayment() on-chain (executes transfer)
   */
  async registerConversion(campaignId: string, leadId: string, recipientAddress: string) {
    console.log("\n========================================");
    console.log("[ConversionService] 🚀 Starting conversion flow");
    console.log(`  Campaign ID: ${campaignId}`);
    console.log(`  Lead ID: ${leadId}`);
    console.log(`  Recipient: ${recipientAddress}`);
    console.log("========================================\n");

    // 1. Fetch campaign and lead
    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
    });
    console.log("[ConversionService] ✅ Campaign found:", campaign.name);

    const lead = await prisma.lead.findUniqueOrThrow({
      where: { id: leadId },
      include: { conversations: true },
    });
    console.log("[ConversionService] ✅ Lead found:", lead.name, lead.email);

    // 2. Get conversation messages for AI evaluation
    const conversation = lead.conversations[0];
    if (!conversation) {
      console.log("[ConversionService] ❌ No conversation found for lead");
      throw new Error("No conversation found for this lead");
    }

    const messages = (conversation.messages as any[]).map(
      (m: { role: string; content: string }) => `${m.role}: ${m.content}`
    );
    console.log("[ConversionService] 📝 Conversation messages:", messages.length);

    // 3. Vera evaluates if conversion occurred
    console.log("[ConversionService] 🤖 Vera evaluating conversion...");
    const isConverted = await agentService.evaluateConversion(messages);
    console.log(`[ConversionService] 🤖 Vera verdict: ${isConverted ? "CONVERTED ✅" : "NOT CONVERTED ❌"}`);

    if (!isConverted) {
      console.log("[ConversionService] ⚠️ Conversion rejected by Vera - no payment will be made");
      throw new Error("Conversion not confirmed by AI evaluation");
    }

    // 4. Create conversion record in DB
    console.log("[ConversionService] 💾 Creating conversion record in DB...");
    const conversion = await prisma.conversion.create({
      data: {
        campaignId,
        leadId,
        amount: campaign.costPerConversion,
        status: "PENDING",
      },
    });
    console.log("[ConversionService] ✅ Conversion created:", conversion.id);

    try {
      // 5. Register conversion on-chain (backend oracle signs this tx)
      console.log("[ConversionService] ⛓️ Registering conversion on-chain...");
      const registerResult = await escrowService.registerConversion(
        campaignId,
        conversion.id,
        recipientAddress
      );
      console.log(`[ConversionService] ✅ On-chain registration: ${registerResult.txHash}`);

      // 6. Release payment on-chain (trustless, anyone can call)
      console.log("[ConversionService] 💸 Releasing payment on-chain...");
      const releaseResult = await escrowService.releasePayment(conversion.id);
      console.log(`[ConversionService] ✅ Payment released: ${releaseResult.txHash}`);

      // 7. Update conversion status in DB
      await prisma.conversion.update({
        where: { id: conversion.id },
        data: {
          status: "CONFIRMED",
          txHash: releaseResult.txHash,
        },
      });
      console.log("[ConversionService] ✅ DB updated: status = CONFIRMED");

      // 8. Update campaign spent amount
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { spent: { increment: campaign.costPerConversion } },
      });
      console.log(`[ConversionService] ✅ Campaign spent updated: +${campaign.costPerConversion}`);

      console.log("\n========================================");
      console.log("[ConversionService] 🎉 CONVERSION COMPLETE!");
      console.log(`  Conversion ID: ${conversion.id}`);
      console.log(`  Amount: ${campaign.costPerConversion}`);
      console.log(`  Register TX: ${registerResult.txHash}`);
      console.log(`  Release TX: ${releaseResult.txHash}`);
      console.log("========================================\n");

      return {
        ...conversion,
        status: "CONFIRMED",
        txHash: releaseResult.txHash,
        registerTxHash: registerResult.txHash,
      };
    } catch (error) {
      console.log("[ConversionService] ❌ On-chain transaction failed:", error);
      await prisma.conversion.update({
        where: { id: conversion.id },
        data: { status: "FAILED" },
      });
      throw error;
    }
  }

  async listByCampaign(campaignId: string) {
    console.log(`[ConversionService] 📋 Listing conversions for campaign: ${campaignId}`);
    const conversions = await prisma.conversion.findMany({
      where: { campaignId },
      include: { lead: true },
      orderBy: { createdAt: "desc" },
    });
    console.log(`[ConversionService] ✅ Found ${conversions.length} conversions`);
    return conversions;
  }
}

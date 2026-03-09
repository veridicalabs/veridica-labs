import { prisma } from "../db/prisma";
import { EscrowService } from "./escrow.service";

const escrowService = new EscrowService();

export class ConversionService {
  /**
   * Registers a verified conversion:
   * 1. Creates conversion record in DB
   * 2. Calls registerConversion() on-chain (reserves funds)
   * 3. Calls releasePayment() on-chain (executes transfer)
   */
  async registerConversion(campaignId: string, leadId: string, recipientAddress: string) {
    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
    });

    const lead = await prisma.lead.findUniqueOrThrow({
      where: { id: leadId },
    });

    // 1. Create conversion record in DB
    const conversion = await prisma.conversion.create({
      data: {
        campaignId,
        leadId,
        amount: campaign.costPerConversion,
        status: "PENDING",
      },
    });

    try {
      // 2. Register conversion on-chain (backend oracle signs this tx)
      const registerResult = await escrowService.registerConversion(
        campaignId,
        conversion.id, // use DB conversion.id as on-chain conversionId
        recipientAddress
      );

      console.log(`[Conversion] Registered on-chain: ${registerResult.txHash}`);

      // 3. Release payment on-chain (trustless, anyone can call)
      const releaseResult = await escrowService.releasePayment(conversion.id);

      console.log(`[Conversion] Payment released: ${releaseResult.txHash}`);

      // 4. Update conversion status in DB
      await prisma.conversion.update({
        where: { id: conversion.id },
        data: {
          status: "CONFIRMED",
          txHash: releaseResult.txHash,
        },
      });

      // 5. Update campaign spent amount
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { spent: { increment: campaign.costPerConversion } },
      });

      return {
        ...conversion,
        status: "CONFIRMED",
        txHash: releaseResult.txHash,
        registerTxHash: registerResult.txHash,
      };
    } catch (error) {
      // Mark conversion as failed if on-chain tx fails
      await prisma.conversion.update({
        where: { id: conversion.id },
        data: { status: "FAILED" },
      });
      throw error;
    }
  }

  async listByCampaign(campaignId: string) {
    return prisma.conversion.findMany({
      where: { campaignId },
      include: { lead: true },
      orderBy: { createdAt: "desc" },
    });
  }
}

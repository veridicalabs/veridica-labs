import { prisma } from "../db/prisma";

/**
 * Escrow Service
 *
 * For the MVP, blockchain interactions are SIMULATED.
 * In production, this would call the EscrowCampaign smart contract
 * on Syscoin NEVM via ethers.js.
 */
export class EscrowService {
  async depositBudget(campaignId: string, amount: number) {
    // MVP: simulate deposit by updating DB
    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: { deposited: { increment: amount } },
    });

    // In production: call contract.depositBudget({ value: amount })
    console.log(`[Escrow] Simulated deposit of ${amount} for campaign ${campaignId}`);

    return {
      success: true,
      txHash: `0xSIMULATED_${Date.now().toString(16)}`,
      campaign,
    };
  }

  async releasePayment(campaignId: string, amount: number) {
    console.log(`[Escrow] Simulated release of ${amount} for campaign ${campaignId}`);

    return {
      success: true,
      txHash: `0xSIMULATED_${Date.now().toString(16)}`,
      amount,
    };
  }

  async refund(campaignId: string) {
    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
    });

    const refundAmount = campaign.deposited - campaign.spent;

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { deposited: campaign.spent, status: "PAUSED" },
    });

    console.log(`[Escrow] Simulated refund of ${refundAmount} for campaign ${campaignId}`);

    return {
      success: true,
      txHash: `0xSIMULATED_${Date.now().toString(16)}`,
      refundAmount,
    };
  }
}

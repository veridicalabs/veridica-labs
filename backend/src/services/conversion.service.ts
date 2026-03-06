import { prisma } from "../db/prisma";
import { EscrowService } from "./escrow.service";

const escrowService = new EscrowService();

export class ConversionService {
  async registerConversion(campaignId: string, leadId: string) {
    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
    });

    const conversion = await prisma.conversion.create({
      data: {
        campaignId,
        leadId,
        amount: campaign.costPerConversion,
        status: "CONFIRMED",
      },
    });

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { spent: { increment: campaign.costPerConversion } },
    });

    await escrowService.releasePayment(campaignId, campaign.costPerConversion);

    return conversion;
  }

  async listByCampaign(campaignId: string) {
    return prisma.conversion.findMany({
      where: { campaignId },
      include: { lead: true },
      orderBy: { createdAt: "desc" },
    });
  }
}

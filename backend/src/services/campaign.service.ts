import { prisma } from "../db/prisma";

interface CreateCampaignInput {
  name: string;
  description: string;
  budget: number;
  costPerConversion: number;
}

export class CampaignService {
  async createCampaign(input: CreateCampaignInput) {
    return prisma.campaign.create({
      data: {
        name: input.name,
        description: input.description,
        budget: input.budget,
        costPerConversion: input.costPerConversion,
        status: "ACTIVE",
        deposited: 0,
        spent: 0,
      },
    });
  }

  async listCampaigns() {
    return prisma.campaign.findMany({
      include: {
        _count: { select: { leads: true, conversions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getCampaign(id: string) {
    return prisma.campaign.findUnique({
      where: { id },
      include: {
        leads: { include: { conversations: true } },
        conversions: true,
      },
    });
  }
}

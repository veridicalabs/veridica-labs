import { vera } from "../agent/vera";
import { prisma } from "../db/prisma";
import type { Campaign } from "@prisma/client";

export class AgentService {
  async generateAd(campaign: Campaign): Promise<string> {
    return vera.generateAd(campaign.name, campaign.description);
  }

  async respondToLead(campaignId: string, leadMessage: string): Promise<string> {
    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
    });
    return vera.respondLead(campaign.name, campaign.description, leadMessage);
  }

  async evaluateConversion(conversationMessages: string[]): Promise<boolean> {
    return vera.confirmConversion(conversationMessages);
  }
}

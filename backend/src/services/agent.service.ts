import { vera } from "../agent/vera";
import { prisma } from "../db/prisma";

export class AgentService {
  async generateAd(campaign: { name: string; description: string }): Promise<string> {
    console.log("[AgentService] 🎨 Generating ad for campaign:", campaign.name);
    const ad = await vera.generateAd(campaign.name, campaign.description);
    console.log("[AgentService] ✅ Ad generated:", ad.substring(0, 50) + "...");
    return ad;
  }

  async respondToLead(campaignId: string, leadMessage: string): Promise<string> {
    console.log("[AgentService] 💬 Responding to lead...");
    console.log(`  Campaign ID: ${campaignId}`);
    console.log(`  Lead message: ${leadMessage.substring(0, 50)}...`);
    
    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
    });
    console.log("[AgentService] ✅ Campaign found:", campaign.name);
    
    const response = await vera.respondLead(campaign.name, campaign.description, leadMessage);
    console.log("[AgentService] ✅ Vera responded:", response.substring(0, 50) + "...");
    return response;
  }

  async evaluateConversion(conversationMessages: string[]): Promise<boolean> {
    console.log("[AgentService] 🔍 Evaluating conversion...");
    console.log(`  Messages count: ${conversationMessages.length}`);
    
    const result = await vera.confirmConversion(conversationMessages);
    console.log(`[AgentService] ✅ Evaluation result: ${result ? "CONVERTED" : "NOT_CONVERTED"}`);
    return result;
  }
}

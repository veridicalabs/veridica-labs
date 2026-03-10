import { vera } from "../agent/vera";
import { prisma } from "../db/prisma";
import type {
  RespondLeadInput,
  RespondLeadOutput,
  GenerateAdInput,
  GenerateAdOutput,
  ConfirmConversionInput,
  ConfirmConversionOutput,
} from "../agent/ai-provider";

export class AgentService {
  /**
   * OpenClaw Skill: Respond to lead message
   */
  async respondLeadSkill(input: RespondLeadInput): Promise<RespondLeadOutput> {
    console.log("[AgentService] 💬 respondLeadSkill()");
    console.log(`  Message: ${input.message.substring(0, 50)}...`);
    
    const result = await vera.respondLeadSkill(input);
    console.log(`[AgentService] ✅ Response: ${result.reply.substring(0, 50)}...`);
    return result;
  }

  /**
   * OpenClaw Skill: Generate ad copy
   */
  async generateAdSkill(input: GenerateAdInput): Promise<GenerateAdOutput> {
    console.log("[AgentService] 🎨 generateAdSkill()");
    console.log(`  Service: ${input.service}`);
    console.log(`  Audience: ${input.audience}`);
    console.log(`  Goal: ${input.goal}`);
    
    const result = await vera.generateAdSkill(input);
    console.log(`[AgentService] ✅ Ad: ${result.headline}`);
    return result;
  }

  /**
   * OpenClaw Skill: Confirm conversion
   */
  async confirmConversionSkill(input: ConfirmConversionInput): Promise<ConfirmConversionOutput> {
    console.log("[AgentService] 🔍 confirmConversionSkill()");
    console.log(`  Lead ID: ${input.leadId}`);
    console.log(`  Type: ${input.conversionType}`);
    
    const result = await vera.confirmConversionSkill(input);
    console.log(`[AgentService] ✅ Status: ${result.status}`);
    return result;
  }

  /**
   * Legacy: Generate ad (backward compatibility)
   */
  async generateAd(campaign: { name: string; description: string }): Promise<string> {
    console.log("[AgentService] 🎨 generateAd() (legacy)");
    const ad = await vera.generateAd(campaign.name, campaign.description);
    console.log("[AgentService] ✅ Ad generated");
    return ad;
  }

  /**
   * Legacy: Respond to lead (backward compatibility)
   */
  async respondToLead(campaignId: string, leadMessage: string): Promise<string> {
    console.log("[AgentService] 💬 respondToLead() (legacy)");
    
    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
    });
    
    const response = await vera.respondLead(campaign.name, campaign.description, leadMessage);
    console.log("[AgentService] ✅ Vera responded");
    return response;
  }

  /**
   * Legacy: Evaluate conversion (backward compatibility)
   */
  async evaluateConversion(conversationMessages: string[]): Promise<boolean> {
    console.log("[AgentService] 🔍 evaluateConversion() (legacy)");
    
    const result = await vera.confirmConversion(conversationMessages);
    console.log(`[AgentService] ✅ Result: ${result ? "CONVERTED" : "NOT_CONVERTED"}`);
    return result;
  }
}

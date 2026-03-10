import {
  OpenClawProvider,
  MockAIProvider,
  AIProvider,
  RespondLeadInput,
  RespondLeadOutput,
  GenerateAdInput,
  GenerateAdOutput,
  ConfirmConversionInput,
  ConfirmConversionOutput,
} from "./ai-provider";

/**
 * Vera — AI Marketing Agent
 * 
 * Uses OpenClaw skills for:
 * - respondLead: Respond to incoming leads
 * - generateAd: Create ad copy
 * - confirmConversion: Evaluate conversions
 */
class Vera {
  private provider: OpenClawProvider;
  private legacyProvider: AIProvider;

  constructor() {
    this.provider = new OpenClawProvider();
    this.legacyProvider = new MockAIProvider();
    console.log("[Vera] 🤖 Initialized");
  }

  /**
   * Respond to a lead message using OpenClaw skill
   */
  async respondLeadSkill(input: RespondLeadInput): Promise<RespondLeadOutput> {
    console.log("[Vera] 💬 respondLeadSkill() called");
    console.log(`  Message: ${input.message.substring(0, 50)}...`);
    
    const result = await this.provider.respondLead(input);
    console.log(`[Vera] ✅ Response: ${result.reply.substring(0, 50)}...`);
    return result;
  }

  /**
   * Generate ad copy using OpenClaw skill
   */
  async generateAdSkill(input: GenerateAdInput): Promise<GenerateAdOutput> {
    console.log("[Vera] 🎨 generateAdSkill() called");
    console.log(`  Service: ${input.service}`);
    console.log(`  Audience: ${input.audience}`);
    console.log(`  Goal: ${input.goal}`);
    
    const result = await this.provider.generateAd(input);
    console.log(`[Vera] ✅ Ad generated: ${result.headline}`);
    return result;
  }

  /**
   * Confirm conversion using OpenClaw skill
   */
  async confirmConversionSkill(input: ConfirmConversionInput): Promise<ConfirmConversionOutput> {
    console.log("[Vera] 🔍 confirmConversionSkill() called");
    console.log(`  Lead ID: ${input.leadId}`);
    console.log(`  Type: ${input.conversionType}`);
    
    const result = await this.provider.confirmConversion(input);
    console.log(`[Vera] ✅ Conversion status: ${result.status}`);
    return result;
  }

  /**
   * Legacy method: Generate ad (for backward compatibility)
   */
  async generateAd(campaignName: string, description: string): Promise<string> {
    console.log("[Vera] 🎨 generateAd() called (legacy)");
    
    const result = await this.provider.generateAd({
      service: campaignName,
      audience: "target customers",
      goal: description,
    });
    
    return `${result.headline}\n\n${result.body}\n\n${result.cta}`;
  }

  /**
   * Legacy method: Respond to lead (for backward compatibility)
   */
  async respondLead(
    campaignName: string,
    campaignDescription: string,
    leadMessage: string
  ): Promise<string> {
    console.log("[Vera] 💬 respondLead() called (legacy)");
    
    const result = await this.provider.respondLead({
      message: leadMessage,
      campaignContext: `${campaignName}: ${campaignDescription}`,
    });
    
    return result.reply;
  }

  /**
   * Legacy method: Confirm conversion (for backward compatibility)
   */
  async confirmConversion(conversationMessages: string[]): Promise<boolean> {
    console.log("[Vera] 🔍 confirmConversion() called (legacy)");
    
    const result = await this.provider.confirmConversion({
      leadId: "legacy",
      conversionType: "sale",
      conversationHistory: conversationMessages,
    });
    
    return result.status === "confirmed";
  }
}

export const vera = new Vera();

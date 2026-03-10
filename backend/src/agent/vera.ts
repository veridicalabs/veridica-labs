import { AIProvider, MockAIProvider } from "./ai-provider";

class Vera {
  private provider: AIProvider;

  constructor(provider?: AIProvider) {
    this.provider = provider ?? new MockAIProvider();
    console.log("[Vera] 🤖 Initialized with provider:", this.provider.constructor.name);
  }

  async generateAd(campaignName: string, description: string): Promise<string> {
    console.log("[Vera]  generateAd() called");
    console.log(`  Campaign: ${campaignName}`);
    
    const prompt = `[GENERATE_AD]
Campaign: ${campaignName}
Description: ${description}
Generate a compelling ad copy for this campaign.`;

    console.log("[Vera]  Sending prompt to AI provider...");
    const result = await this.provider.generateText(prompt);
    console.log("[Vera]  AI response received:", result.substring(0, 50) + "...");
    return result;
  }

  async respondLead(
    campaignName: string,
    campaignDescription: string,
    leadMessage: string
  ): Promise<string> {
    console.log("[Vera]  respondLead() called");
    console.log(`  Campaign: ${campaignName}`);
    console.log(`  Lead message: ${leadMessage.substring(0, 50)}...`);
    
    const prompt = `[RESPOND_LEAD]
Campaign: ${campaignName}
Description: ${campaignDescription}
Lead message: ${leadMessage}
Respond as a helpful marketing assistant to qualify this lead.`;

    console.log("[Vera]  Sending prompt to AI provider...");
    const result = await this.provider.generateText(prompt);
    console.log("[Vera]  AI response received:", result.substring(0, 50) + "...");
    return result;
  }

  async confirmConversion(conversationMessages: string[]): Promise<boolean> {
    console.log("[Vera]  confirmConversion() called");
    console.log(`  Messages: ${conversationMessages.length}`);
    
    const prompt = `[CONFIRM_CONVERSION]
Conversation:
${conversationMessages.join("\n")}
Evaluate whether this conversation resulted in a conversion. Reply CONVERTED or NOT_CONVERTED.`;

    console.log("[Vera]  Sending prompt to AI provider...");
    const result = await this.provider.generateText(prompt);
    const isConverted = result.trim().toUpperCase() === "CONVERTED";
    console.log(`[Vera]  AI response: "${result.trim()}" → ${isConverted ? "CONVERTED ✅" : "NOT_CONVERTED ❌"}`);
    return isConverted;
  }
}

export const vera = new Vera();

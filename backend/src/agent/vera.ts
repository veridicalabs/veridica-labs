import { AIProvider, MockAIProvider } from "./ai-provider";

class Vera {
  private provider: AIProvider;

  constructor(provider?: AIProvider) {
    this.provider = provider ?? new MockAIProvider();
  }

  async generateAd(campaignName: string, description: string): Promise<string> {
    const prompt = `[GENERATE_AD]
Campaign: ${campaignName}
Description: ${description}
Generate a compelling ad copy for this campaign.`;

    return this.provider.generateText(prompt);
  }

  async respondLead(
    campaignName: string,
    campaignDescription: string,
    leadMessage: string
  ): Promise<string> {
    const prompt = `[RESPOND_LEAD]
Campaign: ${campaignName}
Description: ${campaignDescription}
Lead message: ${leadMessage}
Respond as a helpful marketing assistant to qualify this lead.`;

    return this.provider.generateText(prompt);
  }

  async confirmConversion(conversationMessages: string[]): Promise<boolean> {
    const prompt = `[CONFIRM_CONVERSION]
Conversation:
${conversationMessages.join("\n")}
Evaluate whether this conversation resulted in a conversion. Reply CONVERTED or NOT_CONVERTED.`;

    const result = await this.provider.generateText(prompt);
    return result.trim().toUpperCase() === "CONVERTED";
  }
}

export const vera = new Vera();

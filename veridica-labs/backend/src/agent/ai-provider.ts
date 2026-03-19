import { AzureOpenAI } from "openai";

/**
 * AIProvider interface — abstraction layer for AI backends.
 *
 * Implement this interface to plug in Azure OpenAI, OpenClaw, or any other
 * LLM provider.
 */
export interface AIProvider {
  generateText(prompt: string): Promise<string>;
}

/**
 * Azure OpenAI provider using GPT-4o.
 */
export class AzureOpenAIProvider implements AIProvider {
  private client: AzureOpenAI;
  private deployment: string;

  constructor() {
    this.deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o";
    this.client = new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2025-01-01-preview",
    });
  }

  async generateText(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.deployment,
      messages: [
        { role: "system", content: "You are Vera, an AI marketing assistant for Veridica Labs. Be concise, professional, and persuasive." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 512,
    });

    return response.choices[0]?.message?.content ?? "";
  }
}

/**
 * Mock AI provider for testing without external API calls.
 */
export class MockAIProvider implements AIProvider {
  async generateText(prompt: string): Promise<string> {
    if (prompt.includes("[GENERATE_AD]")) {
      return "Discover a smarter way to grow your business. Our solution delivers real results — you only pay when it works. Try it today and see the difference!";
    }

    if (prompt.includes("[RESPOND_LEAD]")) {
      return "Thanks for reaching out! I'd love to learn more about your needs. Could you tell me what specific challenge you're looking to solve? We have flexible solutions that might be a great fit.";
    }

    if (prompt.includes("[CONFIRM_CONVERSION]")) {
      return "CONVERTED";
    }

    return "I'm Vera, your AI marketing assistant. How can I help?";
  }
}

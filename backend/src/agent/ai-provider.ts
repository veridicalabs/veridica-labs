/**
 * AIProvider interface — abstraction layer for AI backends.
 *
 * Implement this interface to plug in OpenClaw, OpenAI, or any other
 * LLM provider. For the MVP, MockAIProvider is used.
 */
export interface AIProvider {
  generateText(prompt: string): Promise<string>;
}

/**
 * Mock AI provider for MVP / hackathon use.
 * Returns deterministic responses without any external API calls.
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

/**
 * Placeholder for OpenClaw integration.
 * Uncomment and configure when API access is available.
 */
// export class OpenClawProvider implements AIProvider {
//   private apiKey: string;
//   private baseUrl: string;
//
//   constructor(apiKey: string, baseUrl: string) {
//     this.apiKey = apiKey;
//     this.baseUrl = baseUrl;
//   }
//
//   async generateText(prompt: string): Promise<string> {
//     const response = await fetch(`${this.baseUrl}/generate`, {
//       method: "POST",
//       headers: {
//         "Authorization": `Bearer ${this.apiKey}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ prompt }),
//     });
//     const data = await response.json();
//     return data.text;
//   }
// }

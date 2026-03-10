/**
 * AIProvider interface — abstraction layer for AI backends.
 *
 * Implement this interface to plug in OpenClaw, OpenAI, or any other
 * LLM provider.
 */
export interface AIProvider {
  generateText(prompt: string): Promise<string>;
}

/**
 * OpenClaw Skill Types
 */
export interface RespondLeadInput {
  message: string;
  campaignContext?: string;
}

export interface RespondLeadOutput {
  reply: string;
  intent?: string;
  confidence?: number;
}

export interface GenerateAdInput {
  service: string;
  audience: string;
  goal: string;
  tone?: string;
}

export interface GenerateAdOutput {
  headline: string;
  body: string;
  cta: string;
}

export interface ConfirmConversionInput {
  leadId: string;
  conversionType: string;
  conversationHistory?: string[];
  note?: string;
}

export interface ConfirmConversionOutput {
  status: "confirmed" | "rejected" | "pending";
  leadId: string;
  conversionType: string;
  confidence?: number;
  note?: string;
}

/**
 * OpenClaw Provider — Connects to OpenClaw AI Skills API
 * 
 * Skills configured:
 * - respondLead: Responds to incoming leads with qualifying questions
 * - generateAd: Creates ad copy based on service/audience/goal
 * - confirmConversion: Evaluates if a conversation resulted in conversion
 */
export class OpenClawProvider implements AIProvider {
  private apiKey: string;
  private baseUrl: string;
  private agentId: string;

  constructor() {
    this.apiKey = process.env.OPENCLAW_API_KEY || "";
    this.baseUrl = process.env.OPENCLAW_BASE_URL || "https://api.openclaw.ai";
    this.agentId = process.env.OPENCLAW_AGENT_ID || "";

    if (!this.apiKey) {
      console.log("[OpenClawProvider] ⚠️ OPENCLAW_API_KEY not set - will use mock responses");
    } else {
      console.log("[OpenClawProvider] ✅ Initialized with OpenClaw API");
      console.log(`  Base URL: ${this.baseUrl}`);
      console.log(`  Agent ID: ${this.agentId}`);
    }
  }

  private async callSkill<T, I>(skillName: string, input: I): Promise<T> {
    console.log(`[OpenClawProvider] 🔧 Calling skill: ${skillName}`);
    console.log(`  Input:`, JSON.stringify(input, null, 2));

    if (!this.apiKey) {
      console.log(`[OpenClawProvider] ⚠️ No API key - returning mock response`);
      return this.getMockResponse(skillName, input as Record<string, unknown>) as T;
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/agents/${this.agentId}/skills/${skillName}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OpenClawProvider] ❌ API error: ${response.status} - ${errorText}`);
        throw new Error(`OpenClaw API error: ${response.status}`);
      }

      const data = await response.json() as { output: T };
      console.log(`[OpenClawProvider] ✅ Skill response:`, JSON.stringify(data, null, 2));
      return data.output;
    } catch (error) {
      console.error(`[OpenClawProvider] ❌ Error calling skill:`, error);
      console.log(`[OpenClawProvider] ⚠️ Falling back to mock response`);
      return this.getMockResponse(skillName, input as Record<string, unknown>) as T;
    }
  }

  private getMockResponse(skillName: string, input: Record<string, unknown>): unknown {
    switch (skillName) {
      case "respondLead":
        return {
          reply: `Hola, gracias por escribir a Veridica. ¿Te gustaría agendar una revisión o recibir más información sobre nuestros servicios?`,
          intent: "inquiry",
          confidence: 0.85,
        };
      case "generateAd":
        return {
          headline: `Agenda tu ${input.service || "servicio"} hoy`,
          body: `Atención rápida y confiable para ${input.audience || "tu negocio"}. Escríbenos y agenda ahora.`,
          cta: "Reserva ahora",
        };
      case "confirmConversion":
        return {
          status: "confirmed",
          leadId: input.leadId,
          conversionType: input.conversionType,
          confidence: 0.92,
          note: input.note || null,
        };
      default:
        return { error: "Unknown skill" };
    }
  }

  async respondLead(input: RespondLeadInput): Promise<RespondLeadOutput> {
    return this.callSkill<RespondLeadOutput, RespondLeadInput>("respondLead", input);
  }

  async generateAd(input: GenerateAdInput): Promise<GenerateAdOutput> {
    return this.callSkill<GenerateAdOutput, GenerateAdInput>("generateAd", input);
  }

  async confirmConversion(input: ConfirmConversionInput): Promise<ConfirmConversionOutput> {
    return this.callSkill<ConfirmConversionOutput, ConfirmConversionInput>("confirmConversion", input);
  }

  async generateText(prompt: string): Promise<string> {
    console.log(`[OpenClawProvider] 📝 generateText() called`);
    
    if (!this.apiKey) {
      if (prompt.includes("[GENERATE_AD]")) {
        return "Discover a smarter way to grow your business. Our solution delivers real results — you only pay when it works.";
      }
      if (prompt.includes("[RESPOND_LEAD]")) {
        return "Thanks for reaching out! I'd love to learn more about your needs. Could you tell me what specific challenge you're looking to solve?";
      }
      if (prompt.includes("[CONFIRM_CONVERSION]")) {
        return "CONVERTED";
      }
      return "I'm Vera, your AI marketing assistant. How can I help?";
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/agents/${this.agentId}/chat`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: prompt }),
      });

      if (!response.ok) {
        throw new Error(`OpenClaw API error: ${response.status}`);
      }

      const data = await response.json() as { response?: string; message?: string };
      return data.response || data.message || "";
    } catch (error) {
      console.error(`[OpenClawProvider] ❌ Error:`, error);
      return "I'm having trouble connecting. Please try again.";
    }
  }
}

/**
 * Mock AI provider for development/testing.
 * Returns deterministic responses without any external API calls.
 */
export class MockAIProvider implements AIProvider {
  async generateText(prompt: string): Promise<string> {
    console.log(`[MockAIProvider] 📝 generateText() called`);
    
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

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
  private vpsUrl: string;
  private useVps: boolean;

  // Mapping from skill names to VPS endpoint paths
  private static VPS_ENDPOINTS: Record<string, string> = {
    respondLead: "/vera/respond",
    generateAd: "/vera/generate-ad",
    confirmConversion: "/vera/confirm-conversion",
  };

  constructor() {
    this.apiKey = process.env.OPENCLAW_API_KEY || "";
    this.baseUrl = process.env.OPENCLAW_BASE_URL || "https://api.openclaw.ai";
    this.agentId = process.env.OPENCLAW_AGENT_ID || "";
    this.vpsUrl = process.env.VERA_VPS_URL || ""; // e.g. http://45.xx.xx.xx:8080

    this.useVps = !!this.vpsUrl;

    if (this.useVps) {
      console.log("[OpenClawProvider] ✅ Connected to Vera VPS");
      console.log(`  VPS URL: ${this.vpsUrl}`);
    } else if (!this.apiKey) {
      console.log("[OpenClawProvider] ⚠️ No VERA_VPS_URL or OPENCLAW_API_KEY - will use mock responses");
    } else {
      console.log("[OpenClawProvider] ✅ Initialized with OpenClaw API");
      console.log(`  Base URL: ${this.baseUrl}`);
      console.log(`  Agent ID: ${this.agentId}`);
    }
  }

  private async callSkill<T, I>(skillName: string, input: I): Promise<T> {
    console.log(`[OpenClawProvider] 🔧 Calling skill: ${skillName}`);
    console.log(`  Input:`, JSON.stringify(input, null, 2));

    // Priority 1: VPS (Jeremy's OpenClaw server)
    if (this.useVps) {
      return this.callVps<T, I>(skillName, input);
    }

    // Priority 2: OpenClaw API (cloud)
    if (this.apiKey) {
      return this.callOpenClawApi<T, I>(skillName, input);
    }

    // Priority 3: Mock responses
    console.log(`[OpenClawProvider] ⚠️ No provider available - returning mock response`);
    return this.getMockResponse(skillName, input as Record<string, unknown>) as T;
  }

  /**
   * Extract clean text from raw OpenClaw agent --json output.
   * The VPS returns: { reply: "<raw openclaw output>", intent, confidence }
   * The raw output may contain ANSI codes, log lines, and a JSON with payloads.
   */
  private extractVpsText(rawReply: string): string {
    // Strip ANSI escape codes
    const clean = rawReply.replace(/\u001b\[[0-9;]*m/g, "");

    // Strategy 1: Extract "text" field from payloads via regex (handles malformed JSON)
    const textMatch = clean.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (textMatch) {
      // Unescape the JSON string value
      const unescaped = textMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
      if (unescaped.trim()) return unescaped.trim();
    }

    // Strategy 2: Try full JSON parse
    const jsonMatch = clean.match(/\{[\s\S]*"payloads"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.payloads?.length > 0) {
          return parsed.payloads
            .map((p: { text?: string }) => p.text)
            .filter(Boolean)
            .join("\n");
        }
      } catch {}
    }

    // Fallback: return cleaned text without log/meta lines
    const lines = clean.split("\n").filter(
      (l: string) =>
        l.trim() &&
        !l.includes("[agent/embedded]") &&
        !l.includes("durationMs") &&
        !l.includes('"meta"') &&
        !l.includes('"agentMeta"') &&
        !l.includes("stopReason")
    );
    return lines.join("\n").trim() || clean.trim();
  }

  private async callVps<T, I>(skillName: string, input: I): Promise<T> {
    const endpoint = OpenClawProvider.VPS_ENDPOINTS[skillName];
    if (!endpoint) {
      console.error(`[OpenClawProvider] ❌ No VPS endpoint for skill: ${skillName}`);
      return this.getMockResponse(skillName, input as Record<string, unknown>) as T;
    }

    const url = `${this.vpsUrl}${endpoint}`;
    console.log(`[OpenClawProvider] 📡 Calling VPS: ${url}`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OpenClawProvider] ❌ VPS error: ${response.status} - ${errorText}`);
        throw new Error(`VPS error: ${response.status}`);
      }

      const raw = await response.json() as Record<string, unknown>;
      const replyStr = typeof raw.reply === "string" ? raw.reply : JSON.stringify(raw);
      const text = this.extractVpsText(replyStr);

      console.log(`[OpenClawProvider] ✅ VPS text: ${text.substring(0, 150)}...`);

      // If extraction returned empty (overloaded / empty payloads), throw to trigger fallback
      if (!text || text.includes("overloaded")) {
        throw new Error("VPS returned empty or overloaded response");
      }

      // Map to expected output format per skill
      switch (skillName) {
        case "respondLead":
          return { reply: text, intent: "inquiry", confidence: 0.85 } as T;
        case "generateAd": {
          try {
            const ad = JSON.parse(text);
            if (ad.headline) return ad as T;
          } catch {}
          return { headline: text.substring(0, 100), body: text, cta: "Contactanos" } as T;
        }
        case "confirmConversion": {
          const confirmed = text.toLowerCase().includes("confirmed") || text.toLowerCase().includes("confirmado") || text.toLowerCase().includes("venta");
          return {
            status: confirmed ? "confirmed" : "rejected",
            leadId: (input as Record<string, unknown>).leadId || "",
            conversionType: (input as Record<string, unknown>).conversionType || "sale",
            confidence: 0.85,
            note: text,
          } as T;
        }
        default:
          return raw as T;
      }
    } catch (error) {
      console.error(`[OpenClawProvider] ❌ VPS call failed:`, error);
      console.log(`[OpenClawProvider] ⚠️ Falling back to mock response`);
      return this.getMockResponse(skillName, input as Record<string, unknown>) as T;
    }
  }

  private async callOpenClawApi<T, I>(skillName: string, input: I): Promise<T> {
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

    // Route through VPS if available
    if (this.useVps) {
      try {
        const result = await this.callVps<RespondLeadOutput, RespondLeadInput>(
          "respondLead",
          { message: prompt }
        );
        return result.reply;
      } catch {
        return "I'm having trouble connecting. Please try again.";
      }
    }

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

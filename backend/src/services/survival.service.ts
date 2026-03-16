import { ethers } from "ethers";
import { prisma } from "../db/prisma";

/**
 * Agent mode determines Vera's operational behavior.
 *
 * NORMAL    — Full operation: leads, conversions, on-chain payments
 * DEGRADED  — Responds to messages but does NOT process conversions or on-chain txs
 * PAUSED    — Campaign escrow depleted, no new conversions accepted
 * HIBERNATE — Costs exceed revenue for 3+ days, minimal operation
 */
export type AgentMode = "NORMAL" | "DEGRADED" | "PAUSED" | "HIBERNATE";

export interface HealthStatus {
  database: boolean;
  blockchain: boolean;
  openclaw: boolean;
  overall: boolean;
}

export interface EscrowAlert {
  status: "OK" | "LOW" | "PAUSE";
  balance: string;
  costPerConversion: string;
  conversionsRemaining: number;
}

export interface GasStatus {
  gasPriceGwei: string;
  mode: "NORMAL" | "BATCH_MODE";
}

export class SurvivalService {
  private rpcUrl: string;
  private provider: ethers.JsonRpcProvider | null = null;

  // Gas threshold in Gwei — above this we batch conversions
  private static GAS_THRESHOLD_GWEI = 100;

  constructor() {
    this.rpcUrl = process.env.RPC_URL_TESTNET || "https://rpc.tanenbaum.io";
    try {
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    } catch {
      console.log("[SurvivalService] ⚠️ Could not connect to RPC");
    }
  }

  /**
   * Rule 3 — Dependency Health: checks PostgreSQL, Syscoin RPC, and OpenClaw API
   */
  async healthCheck(): Promise<HealthStatus> {
    const results: HealthStatus = {
      database: false,
      blockchain: false,
      openclaw: false,
      overall: false,
    };

    // Check PostgreSQL
    try {
      await prisma.$queryRaw`SELECT 1`;
      results.database = true;
    } catch {
      console.error("[SurvivalService] ❌ Database unreachable");
    }

    // Check Syscoin RPC
    try {
      if (this.provider) {
        await this.provider.getBlockNumber();
        results.blockchain = true;
      }
    } catch {
      console.error("[SurvivalService] ❌ Syscoin RPC unreachable");
    }

    // Check OpenClaw API
    try {
      const baseUrl = process.env.OPENCLAW_BASE_URL || "https://api.openclaw.ai";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${baseUrl}/health`, { signal: controller.signal }).catch(() => null);
      clearTimeout(timeout);
      results.openclaw = res !== null && res.ok;
    } catch {
      console.error("[SurvivalService] ❌ OpenClaw API unreachable");
    }

    results.overall = results.database && results.blockchain;
    return results;
  }

  /**
   * Rule 2 — Exitability: checks if escrow has enough balance for more conversions
   */
  async checkEscrowBalance(campaignId: string): Promise<EscrowAlert> {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return { status: "PAUSE", balance: "0", costPerConversion: "0", conversionsRemaining: 0 };
    }

    const remaining = campaign.budget - campaign.spent;
    const conversionsLeft = Math.floor(remaining / campaign.costPerConversion);

    let status: EscrowAlert["status"] = "OK";
    if (conversionsLeft <= 0) {
      status = "PAUSE";
    } else if (conversionsLeft <= 2) {
      status = "LOW";
    }

    return {
      status,
      balance: remaining.toFixed(4),
      costPerConversion: campaign.costPerConversion.toFixed(4),
      conversionsRemaining: conversionsLeft,
    };
  }

  /**
   * Rule 4 — Execution: checks gas price on Syscoin, switches to batch mode if too high
   */
  async checkGasCost(): Promise<GasStatus> {
    try {
      if (!this.provider) {
        return { gasPriceGwei: "0", mode: "NORMAL" };
      }

      const feeData = await this.provider.getFeeData();
      const gasPriceGwei = ethers.formatUnits(feeData.gasPrice || 0n, "gwei");
      const gasPriceNum = parseFloat(gasPriceGwei);

      return {
        gasPriceGwei: gasPriceNum.toFixed(2),
        mode: gasPriceNum > SurvivalService.GAS_THRESHOLD_GWEI ? "BATCH_MODE" : "NORMAL",
      };
    } catch {
      console.error("[SurvivalService] ⚠️ Could not fetch gas price");
      return { gasPriceGwei: "0", mode: "NORMAL" };
    }
  }

  /**
   * Rule 5 — Unit Economics: compares API costs vs revenue for a campaign
   * For MVP, estimates cost based on conversion count * avg cost per LLM call
   */
  async checkUnitEconomics(campaignId: string): Promise<{
    totalRevenue: number;
    estimatedCosts: number;
    margin: number;
    shouldHibernate: boolean;
  }> {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return { totalRevenue: 0, estimatedCosts: 0, margin: 0, shouldHibernate: false };
    }

    // Platform fee revenue (8% of spent)
    const platformFeeBps = Number(process.env.PLATFORM_FEE_BPS || 800);
    const totalRevenue = campaign.spent * (platformFeeBps / 10000);

    // Estimated API costs: ~$0.002 per LLM interaction
    // Rough estimate: 5 LLM calls per conversion (respond, qualify, confirm, etc.)
    const conversions = await prisma.conversion.count({ where: { campaignId } });
    const leads = await prisma.lead.count({ where: { campaignId } });
    const estimatedLLMCalls = leads * 3 + conversions * 2;
    const costPerCall = 0.002;
    const estimatedCosts = estimatedLLMCalls * costPerCall;

    const margin = totalRevenue - estimatedCosts;

    // Check 3-day negative margin (simplified: if current margin is negative)
    const shouldHibernate = margin < 0 && conversions > 5;

    return { totalRevenue, estimatedCosts, margin, shouldHibernate };
  }

  /**
   * Master check: determines the current agent mode based on all survival rules
   */
  async getAgentMode(campaignId?: string): Promise<{
    mode: AgentMode;
    reason: string;
    health: HealthStatus;
    gas: GasStatus;
    escrow?: EscrowAlert;
  }> {
    const health = await this.healthCheck();
    const gas = await this.checkGasCost();

    // Rule 3: If critical dependencies are down → DEGRADED
    if (!health.database) {
      return { mode: "DEGRADED", reason: "Database unreachable", health, gas };
    }
    if (!health.blockchain) {
      return { mode: "DEGRADED", reason: "Syscoin RPC unreachable — conversions will be retried", health, gas };
    }

    // Campaign-specific checks
    if (campaignId) {
      // Rule 2: If escrow depleted → PAUSED
      const escrow = await this.checkEscrowBalance(campaignId);
      if (escrow.status === "PAUSE") {
        return { mode: "PAUSED", reason: "Escrow balance depleted", health, gas, escrow };
      }

      // Rule 5: If economics are negative → HIBERNATE
      const economics = await this.checkUnitEconomics(campaignId);
      if (economics.shouldHibernate) {
        return { mode: "HIBERNATE", reason: "Operating costs exceed revenue for extended period", health, gas, escrow };
      }

      return { mode: "NORMAL", reason: "All systems operational", health, gas, escrow };
    }

    return { mode: "NORMAL", reason: "All systems operational", health, gas };
  }
}

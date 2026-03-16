import { Router, Request, Response } from "express";
import { SurvivalService } from "../services/survival.service";
import { prisma } from "../db/prisma";

export const survivalRoutes = Router();
const survivalService = new SurvivalService();

/**
 * GET /health/full — Full dependency health check (Rule 3)
 */
survivalRoutes.get("/health/full", async (_req: Request, res: Response) => {
  try {
    const health = await survivalService.healthCheck();
    res.json({ status: health.overall ? "ok" : "degraded", dependencies: health });
  } catch (error) {
    res.status(500).json({ error: "Health check failed" });
  }
});

/**
 * GET /agent/mode — Current agent mode (no campaign context)
 */
survivalRoutes.get("/agent/mode", async (_req: Request, res: Response) => {
  try {
    const result = await survivalService.getAgentMode();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Could not determine agent mode" });
  }
});

/**
 * GET /agent/mode/:campaignId — Agent mode for a specific campaign
 */
survivalRoutes.get("/agent/mode/:campaignId", async (req: Request, res: Response) => {
  try {
    const result = await survivalService.getAgentMode(req.params.campaignId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Could not determine agent mode" });
  }
});

/**
 * GET /economics — Operating economics dashboard (Rule 5 + Operating Economics)
 *
 * Returns aggregate economics across all campaigns:
 * - total_revenue: platform fees earned
 * - estimated_costs: estimated LLM API costs
 * - margin: revenue - costs
 * - reserve_allocation: 30% of revenue set aside for reserves
 * - runway_days: estimated days of operation remaining
 */
survivalRoutes.get("/economics", async (_req: Request, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany();
    const totalConversions = await prisma.conversion.count({ where: { status: "CONFIRMED" } });
    const totalLeads = await prisma.lead.count();

    const platformFeeBps = Number(process.env.PLATFORM_FEE_BPS || 800);
    const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
    const totalRevenue = totalSpent * (platformFeeBps / 10000);

    // Estimated costs: ~$0.002 per LLM call, ~5 calls per lead interaction
    const estimatedLLMCalls = totalLeads * 3 + totalConversions * 2;
    const costPerCall = 0.002;
    const estimatedCosts = estimatedLLMCalls * costPerCall;

    const margin = totalRevenue - estimatedCosts;

    // Operating Economics layers
    const reserveAllocation = totalRevenue * 0.3; // 30% to reserves
    const operationalRevenue = totalRevenue * 0.7; // 70% operational

    // Runway: days of operation based on daily cost rate
    const daysSinceFirstCampaign = campaigns.length > 0
      ? Math.max(1, Math.ceil((Date.now() - new Date(campaigns[0].createdAt).getTime()) / 86400000))
      : 1;
    const dailyCost = estimatedCosts / daysSinceFirstCampaign;
    const runwayDays = dailyCost > 0 ? Math.floor(reserveAllocation / dailyCost) : Infinity;

    res.json({
      total_revenue: Number(totalRevenue.toFixed(4)),
      estimated_costs: Number(estimatedCosts.toFixed(4)),
      margin: Number(margin.toFixed(4)),
      platform_fee_bps: platformFeeBps,
      reserve_allocation: Number(reserveAllocation.toFixed(4)),
      operational_revenue: Number(operationalRevenue.toFixed(4)),
      runway_days: runwayDays === Infinity ? "unlimited" : runwayDays,
      campaigns_active: campaigns.filter(c => c.status === "ACTIVE").length,
      total_conversions: totalConversions,
      total_leads: totalLeads,
    });
  } catch (error) {
    console.error("[Economics] Error:", error);
    res.status(500).json({ error: "Could not compute economics" });
  }
});

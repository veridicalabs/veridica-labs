import { prisma } from "../db/prisma";

export class AdminService {
  /** High-level platform KPIs */
  async getMetrics() {
    const [
      totalCampaigns,
      activeCampaigns,
      totalLeads,
      totalConversions,
      paidConversions,
      campaigns,
      recentLeads,
      recentConversions,
      aiLogs,
    ] = await Promise.all([
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: "ACTIVE" } }),
      prisma.lead.count(),
      prisma.conversion.count(),
      prisma.conversion.count({ where: { status: "PAID" } }),
      prisma.campaign.findMany({ select: { budget: true, deposited: true, spent: true } }),
      prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 30, select: { createdAt: true } }),
      prisma.conversion.findMany({ orderBy: { createdAt: "desc" }, take: 30, select: { createdAt: true, amount: true } }),
      prisma.aIUsageLog.count().catch(() => 0),
    ]);

    const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
    const totalDeposited = campaigns.reduce((s, c) => s + c.deposited, 0);
    const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
    const conversionRate = totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) : "0";

    return {
      campaigns: { total: totalCampaigns, active: activeCampaigns },
      leads: { total: totalLeads },
      conversions: { total: totalConversions, paid: paidConversions, rate: parseFloat(conversionRate) },
      financial: { totalBudget, totalDeposited, totalSpent, remaining: totalDeposited - totalSpent },
      ai: { totalCalls: aiLogs },
      recentActivity: {
        leads: recentLeads.map((l) => l.createdAt),
        conversions: recentConversions.map((c) => ({ date: c.createdAt, amount: c.amount })),
      },
    };
  }

  /** Campaign management — full list with detailed stats */
  async getCampaignsAdmin(filters?: { status?: string; search?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return prisma.campaign.findMany({
      where,
      include: {
        _count: { select: { leads: true, conversions: true, conversations: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Update campaign status */
  async updateCampaignStatus(id: string, status: string) {
    return prisma.campaign.update({ where: { id }, data: { status } });
  }

  /** Delete campaign and all related data */
  async deleteCampaign(id: string) {
    await prisma.$transaction([
      prisma.conversion.deleteMany({ where: { campaignId: id } }),
      prisma.conversation.deleteMany({ where: { campaignId: id } }),
      prisma.lead.deleteMany({ where: { campaignId: id } }),
      prisma.campaign.delete({ where: { id } }),
    ]);
    return { deleted: true };
  }

  /** Leads & conversions analytics by campaign */
  async getLeadAnalytics() {
    const campaigns = await prisma.campaign.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        budget: true,
        spent: true,
        costPerConversion: true,
        _count: { select: { leads: true, conversions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return campaigns.map((c) => ({
      ...c,
      conversionRate: c._count.leads > 0 ? ((c._count.conversions / c._count.leads) * 100).toFixed(1) : "0",
      roi: c.spent > 0 ? (((c._count.conversions * c.costPerConversion - c.spent) / c.spent) * 100).toFixed(1) : "0",
    }));
  }

  /** AI/OpenClaw usage stats */
  async getAIUsageStats() {
    try {
      const [logs, byAction, recentErrors] = await Promise.all([
        prisma.aIUsageLog.aggregate({
          _count: true,
          _avg: { latencyMs: true, promptTokens: true, outputTokens: true },
          _sum: { promptTokens: true, outputTokens: true },
        }),
        prisma.aIUsageLog.groupBy({
          by: ["action"],
          _count: true,
          _avg: { latencyMs: true },
        }),
        prisma.aIUsageLog.findMany({
          where: { success: false },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      ]);

      const recentLogs = await prisma.aIUsageLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return {
        summary: {
          totalCalls: logs._count,
          avgLatencyMs: Math.round(logs._avg.latencyMs ?? 0),
          totalPromptTokens: logs._sum.promptTokens ?? 0,
          totalOutputTokens: logs._sum.outputTokens ?? 0,
        },
        byAction: byAction.map((a) => ({
          action: a.action,
          count: a._count,
          avgLatencyMs: Math.round(a._avg.latencyMs ?? 0),
        })),
        recentErrors,
        recentLogs,
      };
    } catch {
      return {
        summary: { totalCalls: 0, avgLatencyMs: 0, totalPromptTokens: 0, totalOutputTokens: 0 },
        byAction: [],
        recentErrors: [],
        recentLogs: [],
      };
    }
  }

  /** Financial / escrow overview */
  async getFinancialOverview() {
    const campaigns = await prisma.campaign.findMany({
      select: {
        id: true,
        name: true,
        budget: true,
        deposited: true,
        spent: true,
        status: true,
        costPerConversion: true,
        _count: { select: { conversions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const conversions = await prisma.conversion.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { campaign: { select: { name: true } }, lead: { select: { name: true } } },
    });

    const totals = campaigns.reduce(
      (acc, c) => ({
        budget: acc.budget + c.budget,
        deposited: acc.deposited + c.deposited,
        spent: acc.spent + c.spent,
      }),
      { budget: 0, deposited: 0, spent: 0 }
    );

    return { totals: { ...totals, remaining: totals.deposited - totals.spent }, campaigns, recentConversions: conversions };
  }

  /** System health check */
  async getSystemHealth() {
    const dbStart = Date.now();
    let dbOk = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch { /* db unreachable */ }
    const dbLatency = Date.now() - dbStart;

    let recentEvents: unknown[] = [];
    try {
      recentEvents = await prisma.systemEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    } catch { /* table may not exist yet */ }

    const counts = await Promise.all([
      prisma.campaign.count(),
      prisma.lead.count(),
      prisma.conversion.count(),
      prisma.conversation.count(),
    ]);

    return {
      status: dbOk ? "healthy" : "degraded",
      database: { connected: dbOk, latencyMs: dbLatency },
      tables: {
        campaigns: counts[0],
        leads: counts[1],
        conversions: counts[2],
        conversations: counts[3],
      },
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      recentEvents,
    };
  }

  /** Log an AI usage event */
  async logAIUsage(data: {
    campaignId?: string;
    action: string;
    model?: string;
    promptTokens?: number;
    outputTokens?: number;
    latencyMs?: number;
    success?: boolean;
    error?: string;
  }) {
    try {
      return await prisma.aIUsageLog.create({ data });
    } catch {
      return null;
    }
  }

  /** Log a system event */
  async logSystemEvent(type: string, message: string, metadata?: unknown) {
    try {
      return await prisma.systemEvent.create({ data: { type, message, metadata: metadata as any } });
    } catch {
      return null;
    }
  }
}

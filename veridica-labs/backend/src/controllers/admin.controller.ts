import { Request, Response } from "express";
import { AdminService } from "../services/admin.service";

const adminService = new AdminService();

export const adminController = {
  getMetrics: async (_req: Request, res: Response) => {
    try {
      const metrics = await adminService.getMetrics();
      res.json(metrics);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  },

  getCampaigns: async (req: Request, res: Response) => {
    try {
      const { status, search } = req.query;
      const campaigns = await adminService.getCampaignsAdmin({
        status: status as string | undefined,
        search: search as string | undefined,
      });
      res.json(campaigns);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  },

  updateCampaignStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!["ACTIVE", "PAUSED", "COMPLETED"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const campaign = await adminService.updateCampaignStatus(id, status);
      res.json(campaign);
    } catch (err) {
      res.status(500).json({ error: "Failed to update campaign" });
    }
  },

  deleteCampaign: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await adminService.deleteCampaign(id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to delete campaign" });
    }
  },

  getLeadAnalytics: async (_req: Request, res: Response) => {
    try {
      const analytics = await adminService.getLeadAnalytics();
      res.json(analytics);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  },

  getAIUsage: async (_req: Request, res: Response) => {
    try {
      const usage = await adminService.getAIUsageStats();
      res.json(usage);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch AI usage" });
    }
  },

  getFinancialOverview: async (_req: Request, res: Response) => {
    try {
      const overview = await adminService.getFinancialOverview();
      res.json(overview);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch financial overview" });
    }
  },

  getSystemHealth: async (_req: Request, res: Response) => {
    try {
      const health = await adminService.getSystemHealth();
      res.json(health);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch system health" });
    }
  },
};

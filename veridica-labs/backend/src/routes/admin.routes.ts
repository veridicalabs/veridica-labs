import { Router } from "express";
import { adminController } from "../controllers/admin.controller";

export const adminRoutes = Router();

// Dashboard metrics
adminRoutes.get("/metrics", adminController.getMetrics);

// Campaign management
adminRoutes.get("/campaigns", adminController.getCampaigns);
adminRoutes.patch("/campaigns/:id/status", adminController.updateCampaignStatus);
adminRoutes.delete("/campaigns/:id", adminController.deleteCampaign);

// Analytics
adminRoutes.get("/analytics/leads", adminController.getLeadAnalytics);

// AI / OpenClaw usage
adminRoutes.get("/ai-usage", adminController.getAIUsage);

// Financial / escrow
adminRoutes.get("/financial", adminController.getFinancialOverview);

// System health
adminRoutes.get("/health", adminController.getSystemHealth);

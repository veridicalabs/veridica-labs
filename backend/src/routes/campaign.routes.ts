import { Router } from "express";
import { CampaignController } from "../controllers/campaign.controller";

export const campaignRoutes = Router();
const ctrl = new CampaignController();

// OpenClaw Skill endpoint
campaignRoutes.post("/generate-ad", ctrl.generateAd);

// Legacy endpoints
campaignRoutes.post("/", ctrl.create);
campaignRoutes.get("/", ctrl.list);
campaignRoutes.get("/:id", ctrl.getById);

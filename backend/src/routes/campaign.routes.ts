import { Router } from "express";
import { CampaignController } from "../controllers/campaign.controller";

export const campaignRoutes = Router();
const ctrl = new CampaignController();

campaignRoutes.post("/", ctrl.create);
campaignRoutes.get("/", ctrl.list);
campaignRoutes.get("/:id", ctrl.getById);

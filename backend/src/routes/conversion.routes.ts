import { Router } from "express";
import { ConversionController } from "../controllers/conversion.controller";

export const conversionRoutes = Router();
const ctrl = new ConversionController();

// OpenClaw Skill endpoint
conversionRoutes.post("/confirm", ctrl.confirmSkill);

// Legacy endpoints
conversionRoutes.post("/", ctrl.confirm);
conversionRoutes.get("/campaign/:campaignId", ctrl.listByCampaign);

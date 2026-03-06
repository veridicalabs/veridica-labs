import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";

export const leadRoutes = Router();
const ctrl = new LeadController();

leadRoutes.post("/", ctrl.create);
leadRoutes.get("/campaign/:campaignId", ctrl.listByCampaign);

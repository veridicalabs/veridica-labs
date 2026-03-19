import { Router } from "express";
import { ConversionController } from "../controllers/conversion.controller";

export const conversionRoutes = Router();
const ctrl = new ConversionController();

conversionRoutes.post("/", ctrl.confirm);
conversionRoutes.get("/campaign/:campaignId", ctrl.listByCampaign);

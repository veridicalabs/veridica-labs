import { Request, Response } from "express";
import { ConversionService } from "../services/conversion.service";

const conversionService = new ConversionService();

export class ConversionController {
  confirm = async (req: Request, res: Response) => {
    try {
      const { campaignId, leadId } = req.body;
      const conversion = await conversionService.registerConversion(
        campaignId,
        leadId
      );
      res.status(201).json(conversion);
    } catch (error) {
      res.status(500).json({ error: "Failed to confirm conversion" });
    }
  };

  listByCampaign = async (req: Request, res: Response) => {
    try {
      const conversions = await conversionService.listByCampaign(
        req.params.campaignId
      );
      res.json(conversions);
    } catch (error) {
      res.status(500).json({ error: "Failed to list conversions" });
    }
  };
}

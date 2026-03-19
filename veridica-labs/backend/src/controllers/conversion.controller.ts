import { Request, Response } from "express";
import { ConversionService } from "../services/conversion.service";

const conversionService = new ConversionService();

export class ConversionController {
  /**
   * POST /conversion
   * Confirms a conversion and triggers on-chain payment.
   * 
   * Body:
   * - campaignId: string
   * - leadId: string
   * - recipientAddress: string (marketing provider wallet)
   */
  confirm = async (req: Request, res: Response) => {
    try {
      const { campaignId, leadId, recipientAddress } = req.body;

      if (!recipientAddress) {
        return res.status(400).json({ error: "recipientAddress is required" });
      }

      const conversion = await conversionService.registerConversion(
        campaignId,
        leadId,
        recipientAddress
      );
      res.status(201).json(conversion);
    } catch (error) {
      console.error("[ConversionController] Error:", error);
      res.status(500).json({ 
        error: "Failed to confirm conversion",
        details: error instanceof Error ? error.message : String(error)
      });
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

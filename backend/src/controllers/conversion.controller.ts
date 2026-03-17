import { Request, Response } from "express";
import { ConversionService } from "../services/conversion.service";
import { AgentService } from "../services/agent.service";

const conversionService = new ConversionService();
const agentService = new AgentService();

export class ConversionController {
  /**
   * POST /api/conversion/confirm
   * OpenClaw Skill: Confirm a conversion
   */
  confirmSkill = async (req: Request, res: Response) => {
    try {
      const { leadId, conversionType, conversationHistory, note } = req.body;

      console.log("\n========================================");
      console.log("[ConversionController] 🔍 POST /api/conversion/confirm");
      console.log(`  Lead ID: ${leadId}`);
      console.log(`  Type: ${conversionType}`);
      console.log(`  Note: ${note || "none"}`);
      console.log("========================================\n");

      if (!leadId || !conversionType) {
        return res.status(400).json({ 
          error: "leadId and conversionType are required" 
        });
      }

      const result = await agentService.confirmConversionSkill({
        leadId,
        conversionType,
        conversationHistory,
        note,
      });

      console.log("[ConversionController] ✅ Conversion status:", result.status);
      res.json(result);
    } catch (error) {
      console.log("[ConversionController] ❌ Error:", error);
      res.status(500).json({ error: "Failed to confirm conversion" });
    }
  };

  /**
   * POST /conversion (legacy)
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

      // Default to treasury address if not provided (for demo/frontend)
      const recipient = recipientAddress || process.env.TREASURY_ADDRESS || process.env.VERIFIER_ADDRESS;
      if (!recipient) {
        return res.status(400).json({ error: "recipientAddress is required and no default TREASURY_ADDRESS configured" });
      }

      const conversion = await conversionService.registerConversion(
        campaignId,
        leadId,
        recipient
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

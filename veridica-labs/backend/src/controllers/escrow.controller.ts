import { Request, Response } from "express";
import { EscrowService } from "../services/escrow.service";

const escrowService = new EscrowService();

export class EscrowController {
  deposit = async (req: Request, res: Response) => {
    try {
      const { campaignId, amount } = req.body;
      const result = await escrowService.depositBudget(campaignId, amount);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to deposit" });
    }
  };

  release = async (req: Request, res: Response) => {
    try {
      const { campaignId, amount } = req.body;
      const result = await escrowService.releasePayment(campaignId, amount);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to release payment" });
    }
  };

  refund = async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.body;
      const result = await escrowService.refund(campaignId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to refund" });
    }
  };
}

import { Request, Response } from "express";
import { CampaignService } from "../services/campaign.service";
import { AgentService } from "../services/agent.service";

const campaignService = new CampaignService();
const agentService = new AgentService();

export class CampaignController {
  create = async (req: Request, res: Response) => {
    try {
      const { name, description, budget, costPerConversion } = req.body;
      const campaign = await campaignService.createCampaign({
        name,
        description,
        budget,
        costPerConversion,
      });

      const adCopy = await agentService.generateAd(campaign);

      res.status(201).json({ campaign, adCopy });
    } catch (error) {
      res.status(500).json({ error: "Failed to create campaign" });
    }
  };

  list = async (_req: Request, res: Response) => {
    try {
      const campaigns = await campaignService.listCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to list campaigns" });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const campaign = await campaignService.getCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ error: "Not found" });
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: "Failed to get campaign" });
    }
  };
}

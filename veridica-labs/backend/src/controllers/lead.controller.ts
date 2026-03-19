import { Request, Response } from "express";
import { AgentService } from "../services/agent.service";
import { prisma } from "../db/prisma";

const agentService = new AgentService();

export class LeadController {
  create = async (req: Request, res: Response) => {
    try {
      const { campaignId, name, email, message } = req.body;

      const lead = await prisma.lead.create({
        data: { campaignId, name, email },
      });

      const conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          campaignId,
          messages: [{ role: "lead", content: message }],
        },
      });

      const agentReply = await agentService.respondToLead(
        campaignId,
        message
      );

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          messages: [
            { role: "lead", content: message },
            { role: "agent", content: agentReply },
          ],
        },
      });

      res.status(201).json({ lead, agentReply });
    } catch (error) {
      res.status(500).json({ error: "Failed to process lead" });
    }
  };

  listByCampaign = async (req: Request, res: Response) => {
    try {
      const leads = await prisma.lead.findMany({
        where: { campaignId: req.params.campaignId },
        include: { conversations: true },
      });
      res.json(leads);
    } catch (error) {
      res.status(500).json({ error: "Failed to list leads" });
    }
  };
}

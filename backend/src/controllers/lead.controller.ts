import { Request, Response } from "express";
import { AgentService } from "../services/agent.service";
import { prisma } from "../db/prisma";

const agentService = new AgentService();

export class LeadController {
  create = async (req: Request, res: Response) => {
    try {
      const { campaignId, name, email, message } = req.body;

      console.log("\n========================================");
      console.log("[LeadController]  New lead received");
      console.log(`  Campaign ID: ${campaignId}`);
      console.log(`  Name: ${name}`);
      console.log(`  Email: ${email}`);
      console.log(`  Message: ${message}`);
      console.log("========================================\n");

      // 1. Create lead in DB
      console.log("[LeadController]  Creating lead in DB...");
      const lead = await prisma.lead.create({
        data: { campaignId, name, email },
      });
      console.log("[LeadController]  Lead created:", lead.id);

      // 2. Create conversation
      console.log("[LeadController]  Creating conversation...");
      const conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          campaignId,
          messages: [{ role: "lead", content: message }],
        },
      });
      console.log("[LeadController]  Conversation created:", conversation.id);

      // 3. Vera responds to lead
      console.log("[LeadController]  Vera responding to lead...");
      const agentReply = await agentService.respondToLead(
        campaignId,
        message
      );
      console.log("[LeadController] Vera response:", agentReply.substring(0, 100) + "...");

      // 4. Update conversation with agent reply
      console.log("[LeadController]  Saving Vera response to conversation...");
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          messages: [
            { role: "lead", content: message },
            { role: "agent", content: agentReply },
          ],
        },
      });
      console.log("[LeadController]  Conversation updated");

      console.log("\n========================================");
      console.log("[LeadController] 🎉 LEAD PROCESSED SUCCESSFULLY!");
      console.log(`  Lead ID: ${lead.id}`);
      console.log(`  Conversation ID: ${conversation.id}`);
      console.log("========================================\n");

      res.status(201).json({ lead, agentReply });
    } catch (error) {
      console.log("[LeadController] ❌ Error processing lead:", error);
      res.status(500).json({ error: "Failed to process lead" });
    }
  };

  listByCampaign = async (req: Request, res: Response) => {
    try {
      console.log(`[LeadController] 📋 Listing leads for campaign: ${req.params.campaignId}`);
      const leads = await prisma.lead.findMany({
        where: { campaignId: req.params.campaignId },
        include: { conversations: true },
      });
      console.log(`[LeadController] ✅ Found ${leads.length} leads`);
      res.json(leads);
    } catch (error) {
      console.log("[LeadController] ❌ Error listing leads:", error);
      res.status(500).json({ error: "Failed to list leads" });
    }
  };
}

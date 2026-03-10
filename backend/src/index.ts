import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { campaignRoutes } from "./routes/campaign.routes";
import { leadRoutes } from "./routes/lead.routes";
import { conversionRoutes } from "./routes/conversion.routes";
import { escrowRoutes } from "./routes/escrow.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (Object.keys(req.body).length > 0) {
    console.log("[Request Body]", JSON.stringify(req.body, null, 2));
  }
  next();
});

app.get("/health", (_req, res) => {
  console.log("[Health] ✅ Health check OK");
  res.json({ status: "ok", service: "veridica-api" });
});

app.use("/campaign", campaignRoutes);
app.use("/lead", leadRoutes);
app.use("/conversion", conversionRoutes);
app.use("/escrow", escrowRoutes);

app.listen(PORT, () => {
  console.log("\n========================================");
  console.log(" VERIDICA API SERVER");
  console.log("========================================");
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log("========================================");
  console.log(" OpenClaw Skill Endpoints:");
  console.log("  POST /lead/respond          - Respond to lead message");
  console.log("  POST /campaign/generate-ad  - Generate ad copy");
  console.log("  POST /conversion/confirm    - Confirm conversion");
  console.log("----------------------------------------");
  console.log(" Legacy Endpoints:");
  console.log("  POST /lead                  - Create lead + Vera response");
  console.log("  POST /conversion            - Confirm + on-chain payment");
  console.log("  POST /campaign              - Create campaign");
  console.log("  GET  /campaign              - List campaigns");
  console.log("  GET  /campaign/:id          - Get campaign by ID");
  console.log("  GET  /lead/campaign/:id     - List leads by campaign");
  console.log("  GET  /conversion/campaign/:id - List conversions");
  console.log("========================================\n");
});

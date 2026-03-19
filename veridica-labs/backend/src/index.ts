import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { campaignRoutes } from "./routes/campaign.routes";
import { leadRoutes } from "./routes/lead.routes";
import { conversionRoutes } from "./routes/conversion.routes";
import { escrowRoutes } from "./routes/escrow.routes";
import { adminRoutes } from "./routes/admin.routes";
import { authRoutes } from "./routes/auth.routes";
import { adminAuth } from "./middleware/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "veridica-api" });
});

app.use("/campaign", campaignRoutes);
app.use("/lead", leadRoutes);
app.use("/conversion", conversionRoutes);
app.use("/escrow", escrowRoutes);
app.use("/auth", authRoutes);
app.use("/admin", adminAuth, adminRoutes);

app.listen(PORT, () => {
  console.log(`Veridica API running on http://localhost:${PORT}`);
});

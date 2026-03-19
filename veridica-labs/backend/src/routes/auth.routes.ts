import { Router, Request, Response } from "express";
import { generateAdminToken, verifyAdminPassword, adminAuth } from "../middleware/auth";

export const authRoutes = Router();

authRoutes.post("/login", (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password || !verifyAdminPassword(password)) {
    return res.status(401).json({ error: "Invalid password" });
  }
  const token = generateAdminToken();
  res.json({ token });
});

authRoutes.get("/verify", adminAuth, (_req: Request, res: Response) => {
  res.json({ valid: true });
});

import { Router } from "express";
import { EscrowController } from "../controllers/escrow.controller";

export const escrowRoutes = Router();
const ctrl = new EscrowController();

escrowRoutes.post("/deposit", ctrl.deposit);
escrowRoutes.post("/release", ctrl.release);
escrowRoutes.post("/refund", ctrl.refund);

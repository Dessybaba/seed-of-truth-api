import { Router } from "express";
import { supabase } from "../lib/supabase";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const { error } = await supabase.from("speakers").select("id").limit(1);

  res.status(error ? 503 : 200).json({
    status: error ? "degraded" : "ok",
    database: error ? "unreachable" : "connected",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
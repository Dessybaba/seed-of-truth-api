import { Router } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import { AppError } from "../lib/errors";
import { uuidString } from "../lib/validation";

export const speakersRouter = Router();

const idParams = z.object({
    id: uuidString("Speaker id must be a valid UUID"),
});

// GET /api/v1/speakers
speakersRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("speakers")
    .select("id, name, bio")
    .order("name");

  if (error) throw new AppError(500, error.message, "DB_ERROR");

  res.json({ count: data.length, data });
});

// GET /api/v1/speakers/:id
speakersRouter.get("/:id", async (req, res) => {
  const { id } = idParams.parse(req.params);

  const { data, error } = await supabase
    .from("speakers")
    .select("id, name, bio")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new AppError(500, error.message, "DB_ERROR");
  if (!data) throw new AppError(404, "Speaker not found", "NOT_FOUND");

  res.json({ data });
});
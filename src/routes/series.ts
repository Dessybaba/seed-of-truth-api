import { Router } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import { AppError } from "../lib/errors";
import { uuidString } from "../lib/validation";

export const seriesRouter = Router();

const listQuery = z.object({
  year: z.coerce.number().int().min(1900).max(2100).optional(),
    speaker: uuidString("speaker must be a valid UUID").optional(),
  topic: z.string().trim().min(1).max(60).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const idParams = z.object({
   id: uuidString("Series id must be a valid UUID"),
});

type SeriesRow = {
  id: string;
  title: string;
  description: string | null;
  year: number | null;
  topic_tags: string[];
  cover_image_url: string | null;
  speaker_id: string | null;
  speakers: { name: string } | null;
  tracks: { count: number }[];
};

// GET /api/v1/series?year=2022&speaker=<uuid>&topic=Prayer&q=faith&page=1&limit=12
seriesRouter.get("/", async (req, res) => {
  const { year, speaker, topic, q, page, limit } = listQuery.parse(req.query);

  let query = supabase
    .from("series")
    .select(
      "id, title, description, year, topic_tags, cover_image_url, speaker_id, speakers(name), tracks(count)",
      { count: "exact" }
    );

  if (year) query = query.eq("year", year);
  if (speaker) query = query.eq("speaker_id", speaker);
  if (topic) query = query.contains("topic_tags", [topic]);
  if (q) {
    // Remove characters that have special meaning inside a filter string
    const safe = q.replace(/[,()%*]/g, " ").trim();
    query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await query
    .order("year", { ascending: false })
    .order("title", { ascending: true })
    .range(from, to);

  if (error) throw new AppError(500, error.message, "DB_ERROR");

  const rows = (data ?? []) as unknown as SeriesRow[];
  const total = count ?? 0;

  res.json({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    data: rows.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      year: s.year,
      topicTags: s.topic_tags,
      coverImageUrl: s.cover_image_url,
      speaker: s.speakers ? { id: s.speaker_id, name: s.speakers.name } : null,
      trackCount: s.tracks?.[0]?.count ?? 0,
    })),
  });
});

// GET /api/v1/series/filters  (must stay ABOVE the /:id route)
seriesRouter.get("/filters", async (_req, res) => {
  const { data, error } = await supabase.from("series").select("year, topic_tags");

  if (error) throw new AppError(500, error.message, "DB_ERROR");

  const rows = data ?? [];

  const years = [
    ...new Set(rows.map((r) => r.year).filter((y): y is number => y !== null)),
  ].sort((a, b) => b - a);

  const topics = [...new Set(rows.flatMap((r) => r.topic_tags ?? []))].sort(
    (a, b) => a.localeCompare(b)
  );

  res.json({ data: { years, topics } });
});

// GET /api/v1/series/:id  (series + speaker + tracks ordered by part_number)
seriesRouter.get("/:id", async (req, res) => {
  const { id } = idParams.parse(req.params);

  const { data: series, error: seriesError } = await supabase
    .from("series")
    .select(
      "id, title, description, year, topic_tags, cover_image_url, speaker_id, speakers(name)"
    )
    .eq("id", id)
    .maybeSingle();

  if (seriesError) throw new AppError(500, seriesError.message, "DB_ERROR");
  if (!series) throw new AppError(404, "Series not found", "NOT_FOUND");

  const { data: tracks, error: tracksError } = await supabase
    .from("tracks")
    .select("id, title, part_number, audio_url, duration_seconds")
    .eq("series_id", id)
    .order("part_number", { ascending: true });

  if (tracksError) throw new AppError(500, tracksError.message, "DB_ERROR");

  const s = series as unknown as SeriesRow;

  res.json({
    data: {
      id: s.id,
      title: s.title,
      description: s.description,
      year: s.year,
      topicTags: s.topic_tags,
      coverImageUrl: s.cover_image_url,
      speaker: s.speakers ? { id: s.speaker_id, name: s.speakers.name } : null,
      trackCount: tracks.length,
      tracks: tracks.map((t) => ({
        id: t.id,
        partNumber: t.part_number,
        title: t.title,
        audioUrl: t.audio_url,
        durationSeconds: t.duration_seconds,
      })),
    },
  });
});
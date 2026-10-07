import { z } from "zod";

// Accepts any 8-4-4-4-12 hex id, including the sample ids in seed.sql.
export const uuidString = (message: string) =>
  z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      message
    );
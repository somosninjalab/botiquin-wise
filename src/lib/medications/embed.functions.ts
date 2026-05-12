import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { embedOne } from "./embed.server";

/** Returns a 512-dim embedding for a search query. */
export const embedQuery = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ q: z.string().min(1).max(500) }).parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const v = await embedOne(data.q, "query");
      return { embedding: v, error: null as string | null };
    } catch (err) {
      console.error("embedQuery failed:", err);
      return { embedding: null as number[] | null, error: (err as Error).message };
    }
  });
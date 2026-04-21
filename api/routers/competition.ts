import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { competitionConfig } from "@db/schema";
import { eq } from "drizzle-orm";

export const competitionRouter = createRouter({
  get: publicQuery.query(async () => {
    const db = getDb();
    const config = await db.query.competitionConfig.findFirst();
    return config;
  }),

  update: adminQuery
    .input(
      z.object({
        name: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        initialCapitalAshare: z.number().optional(),
        initialCapitalUs: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.query.competitionConfig.findFirst();
      if (!existing) throw new Error("Config not found");

      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.startDate !== undefined) updates.startDate = input.startDate;
      if (input.endDate !== undefined) updates.endDate = input.endDate;
      if (input.initialCapitalAshare !== undefined)
        updates.initialCapitalAshare = input.initialCapitalAshare.toString();
      if (input.initialCapitalUs !== undefined)
        updates.initialCapitalUs = input.initialCapitalUs.toString();

      const result = await db
        .update(competitionConfig)
        .set(updates)
        .where(eq(competitionConfig.id, existing.id))
        .returning();

      return result[0];
    }),
});

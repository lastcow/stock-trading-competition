import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { participants } from "@db/schema";
import { eq } from "drizzle-orm";

export const participantRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        type: z.enum(["PERSONAL", "TEAM"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.type) {
        return db.query.participants.findMany({
          where: eq(participants.type, input.type),
        });
      }
      return db.query.participants.findMany();
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.query.participants.findFirst({
        where: eq(participants.id, input.id),
      });
    }),

  create: adminQuery
    .input(
      z.object({
        name: z.string().min(1).max(255),
        type: z.enum(["PERSONAL", "TEAM"]),
        avatar: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(participants).values(input).returning();
      return result[0];
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        type: z.enum(["PERSONAL", "TEAM"]).optional(),
        avatar: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...updates } = input;
      const result = await db
        .update(participants)
        .set(updates)
        .where(eq(participants.id, id))
        .returning();
      return result[0];
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { capitalRecords } = await import("@db/schema");
      await db.delete(capitalRecords).where(eq(capitalRecords.participantId, input.id));
      await db.delete(participants).where(eq(participants.id, input.id));
      return { success: true };
    }),

  bulkDelete: adminQuery
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { capitalRecords } = await import("@db/schema");
      for (const id of input.ids) {
        await db.delete(capitalRecords).where(eq(capitalRecords.participantId, id));
        await db.delete(participants).where(eq(participants.id, id));
      }
      return { success: true, deleted: input.ids.length };
    }),
});

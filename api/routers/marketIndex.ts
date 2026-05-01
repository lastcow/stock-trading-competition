import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { marketIndexes } from "@db/schema";
import { eq, and } from "drizzle-orm";

const marketEnum = z.enum(["A_SHARES", "US_STOCKS"]);

export const marketIndexRouter = createRouter({
  list: publicQuery
    .input(z.object({ market: marketEnum.optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.market) {
        return db.query.marketIndexes.findMany({
          where: eq(marketIndexes.market, input.market),
          orderBy: (mi) => [mi.month],
        });
      }
      return db.query.marketIndexes.findMany({
        orderBy: (mi) => [mi.market, mi.month],
      });
    }),

  save: adminQuery
    .input(
      z.object({
        market: marketEnum,
        month: z.number().min(4).max(9),
        changePercent: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .delete(marketIndexes)
        .where(
          and(
            eq(marketIndexes.market, input.market),
            eq(marketIndexes.month, input.month)
          )
        );
      const result = await db
        .insert(marketIndexes)
        .values({
          market: input.market,
          month: input.month,
          changePercent: input.changePercent.toFixed(4),
          inputBy: "admin",
        })
        .returning();
      return result[0];
    }),
});

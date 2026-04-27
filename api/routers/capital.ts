import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { capitalRecords, participants } from "@db/schema";
import { eq, and, sql } from "drizzle-orm";

const marketEnum = z.enum(["A_SHARES", "US_STOCKS"]);
const typeEnum = z.enum(["PERSONAL", "TEAM"]);

export const capitalRouter = createRouter({
  byParticipant: publicQuery
    .input(z.object({ participantId: z.number(), market: marketEnum.optional() }))
    .query(async ({ input }) => {
      const db = getDb();
      const where = input.market
        ? and(
            eq(capitalRecords.participantId, input.participantId),
            eq(capitalRecords.market, input.market)
          )
        : eq(capitalRecords.participantId, input.participantId);
      return db.query.capitalRecords.findMany({
        where,
        orderBy: (records) => [records.month],
      });
    }),

  byMarketCategory: publicQuery
    .input(z.object({ market: marketEnum, type: typeEnum }))
    .query(async ({ input }) => {
      const db = getDb();
      const pList = await db.query.participants.findMany({
        where: eq(participants.type, input.type),
      });
      const pIds = pList.map((p) => p.id);
      if (pIds.length === 0) return [];

      const records = await db
        .select()
        .from(capitalRecords)
        .where(
          and(
            eq(capitalRecords.market, input.market),
            sql`${capitalRecords.participantId} IN (${sql.join(pIds, sql`, `)})`
          )
        )
        .orderBy(capitalRecords.month);
      return records;
    }),

  rankings: publicQuery
    .input(
      z.object({
        market: marketEnum,
        type: typeEnum,
        month: z.union([z.number().min(4).max(9), z.literal("overall")]),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const pList = await db.query.participants.findMany({
        where: eq(participants.type, input.type),
      });
      if (pList.length === 0) return [];

      const config = await db.query.competitionConfig.findFirst();
      const initialCapital = input.market === "A_SHARES"
        ? Number(config?.initialCapitalAshare ?? 1000000)
        : Number(config?.initialCapitalUs ?? 100000);

      const targetMonth = input.month === "overall" ? 9 : input.month;

      const rankings = [];
      for (const p of pList) {
        const records = await db
          .select()
          .from(capitalRecords)
          .where(
            and(
              eq(capitalRecords.participantId, p.id),
              eq(capitalRecords.market, input.market),
              sql`${capitalRecords.month} <= ${targetMonth}`
            )
          )
          .orderBy(capitalRecords.month);

        if (records.length === 0) {
          rankings.push({
            rank: 0,
            participantId: p.id,
            participantName: p.name,
            initialCapital,
            currentCapital: initialCapital,
            change: 0,
            changePercent: 0,
            totalReturn: 0,
            bestMonth: 0,
            worstMonth: 0,
            monthRecords: [],
          });
          continue;
        }

        const latest = records[records.length - 1];
        const latestCapital = Number(latest.capital);
        const totalChange = latestCapital - initialCapital;
        const totalReturn = (totalChange / initialCapital) * 100;

        let bestMonth = 0;
        let worstMonth = 0;
        let bestReturn = -Infinity;
        let worstReturn = Infinity;

        for (const r of records) {
          const ret = Number(r.changePercent);
          if (ret > bestReturn) { bestReturn = ret; bestMonth = r.month; }
          if (ret < worstReturn) { worstReturn = ret; worstMonth = r.month; }
        }

        rankings.push({
          rank: 0,
          participantId: p.id,
          participantName: p.name,
          initialCapital,
          currentCapital: latestCapital,
          change: totalChange,
          changePercent: Number(latest.changePercent),
          totalReturn,
          bestMonth,
          worstMonth,
          monthRecords: records.map((r) => ({
            month: r.month,
            capital: Number(r.capital),
            change: Number(r.change),
            changePercent: Number(r.changePercent),
          })),
        });
      }

      rankings.sort((a, b) => b.totalReturn - a.totalReturn);
      rankings.forEach((r, i) => { r.rank = i + 1; });

      return rankings;
    }),

  save: adminQuery
    .input(
      z.object({
        participantId: z.number(),
        market: marketEnum,
        month: z.number().min(4).max(9),
        capital: z.number().positive(),
        inputBy: z.string().default("admin"),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { participantId, market, month, capital, inputBy } = input;

      const p = await db.query.participants.findFirst({
        where: eq(participants.id, participantId),
      });
      if (!p) throw new Error("Participant not found");

      const config = await db.query.competitionConfig.findFirst();
      const initialCapital = market === "A_SHARES"
        ? Number(config?.initialCapitalAshare ?? 1000000)
        : Number(config?.initialCapitalUs ?? 100000);

      const prevRecords = await db
        .select()
        .from(capitalRecords)
        .where(
          and(
            eq(capitalRecords.participantId, participantId),
            eq(capitalRecords.market, market),
            sql`${capitalRecords.month} < ${month}`
          )
        )
        .orderBy(sql`${capitalRecords.month} DESC`)
        .limit(1);

      const previousCapital = prevRecords.length > 0
        ? Number(prevRecords[0].capital)
        : initialCapital;

      const change = capital - previousCapital;
      const changePercent = previousCapital > 0 ? (change / previousCapital) * 100 : 0;

      await db
        .delete(capitalRecords)
        .where(
          and(
            eq(capitalRecords.participantId, participantId),
            eq(capitalRecords.market, market),
            eq(capitalRecords.month, month)
          )
        );

      const result = await db
        .insert(capitalRecords)
        .values({
          participantId,
          market,
          month,
          capital: capital.toFixed(2),
          change: change.toFixed(2),
          changePercent: changePercent.toFixed(4),
          inputBy,
        })
        .returning();

      return result[0];
    }),

  batchSave: adminQuery
    .input(
      z.array(
        z.object({
          participantId: z.number(),
          market: marketEnum,
          month: z.number().min(4).max(9),
          capital: z.number().positive(),
        })
      )
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const config = await db.query.competitionConfig.findFirst();

      const results = [];
      for (const item of input) {
        try {
          const p = await db.query.participants.findFirst({
            where: eq(participants.id, item.participantId),
          });
          if (!p) continue;

          const initialCapital = item.market === "A_SHARES"
            ? Number(config?.initialCapitalAshare ?? 1000000)
            : Number(config?.initialCapitalUs ?? 100000);

          const prevRecords = await db
            .select()
            .from(capitalRecords)
            .where(
              and(
                eq(capitalRecords.participantId, item.participantId),
                eq(capitalRecords.market, item.market),
                sql`${capitalRecords.month} < ${item.month}`
              )
            )
            .orderBy(sql`${capitalRecords.month} DESC`)
            .limit(1);

          const previousCapital = prevRecords.length > 0
            ? Number(prevRecords[0].capital)
            : initialCapital;

          const change = item.capital - previousCapital;
          const changePercent = previousCapital > 0 ? (change / previousCapital) * 100 : 0;

          await db
            .delete(capitalRecords)
            .where(
              and(
                eq(capitalRecords.participantId, item.participantId),
                eq(capitalRecords.market, item.market),
                eq(capitalRecords.month, item.month)
              )
            );

          const result = await db
            .insert(capitalRecords)
            .values({
              participantId: item.participantId,
              market: item.market,
              month: item.month,
              capital: item.capital.toFixed(2),
              change: change.toFixed(2),
              changePercent: changePercent.toFixed(4),
              inputBy: "admin",
            })
            .returning();

          results.push(result[0]);
        } catch (e) {
          console.error("Batch save error:", e);
        }
      }
      return results;
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(capitalRecords).where(eq(capitalRecords.id, input.id));
      return { success: true };
    }),
});

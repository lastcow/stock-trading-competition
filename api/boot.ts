import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { sql } from "drizzle-orm";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { participants, capitalRecords, competitionConfig, adminUsers } from "@db/schema";
import { eq } from "drizzle-orm";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

// Idempotent migration: move `market` from participants -> capital_records.
// Safe to run on a fresh DB (creates tables via initial schema first elsewhere)
// or on a DB still on the old schema (backfills then drops).
async function migrateMarketToRecords() {
  const db = getDb();

  const participantsHasMarket = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'participants' AND column_name = 'market'
    ) AS exists
  `);

  if (!participantsHasMarket.rows[0]?.exists) {
    return;
  }

  console.log("Migrating market column from participants -> capital_records...");
  await db.execute(sql`ALTER TABLE capital_records ADD COLUMN IF NOT EXISTS market varchar(20)`);
  await db.execute(sql`
    UPDATE capital_records
    SET market = participants.market
    FROM participants
    WHERE capital_records.participant_id = participants.id
      AND capital_records.market IS NULL
  `);
  await db.execute(sql`ALTER TABLE capital_records ALTER COLUMN market SET NOT NULL`);
  await db.execute(sql`DROP INDEX IF EXISTS capital_record_unique`);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS capital_record_market_unique
    ON capital_records (participant_id, market, month)
  `);
  await db.execute(sql`ALTER TABLE participants DROP COLUMN market`);
  console.log("Migration completed.");
}

async function seedDatabase() {
  try {
    const db = getDb();
    console.log("Checking database state...");

    await migrateMarketToRecords();

    const existingAdmin = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.email, "joy@zheng.me"),
    });

    if (!existingAdmin) {
      const { hashSync } = await import("bcryptjs");
      await db.insert(adminUsers).values({
        email: "joy@zheng.me",
        passwordHash: hashSync("Paradise@188", 10),
        name: "Administrator",
      });
      console.log("Admin user created: joy@zheng.me");
    }

    const existingConfig = await db.query.competitionConfig.findFirst();
    if (!existingConfig) {
      await db.insert(competitionConfig).values({
        name: "巅峰杯模拟股票交易大赛",
        startDate: "2026-04-01",
        endDate: "2026-09-30",
        initialCapitalAshare: "1000000",
        initialCapitalUs: "100000",
      });
      console.log("Competition config created");
    }

    const existingParticipants = await db.query.participants.findMany();
    if (existingParticipants.length === 0) {
      // Each demo participant competes in BOTH A-shares and US stocks.
      const demoParticipants = [
        { name: "张昊天", type: "PERSONAL" as const },
        { name: "李思远", type: "PERSONAL" as const },
        { name: "王梓涵", type: "PERSONAL" as const },
        { name: "陈俊杰", type: "PERSONAL" as const },
        { name: "Michael Chen", type: "PERSONAL" as const },
        { name: "Sarah Liu", type: "PERSONAL" as const },
        { name: "David Wang", type: "PERSONAL" as const },
        { name: "Emily Zhang", type: "PERSONAL" as const },
        { name: "雄鹰战队", type: "TEAM" as const },
        { name: "猛龙组合", type: "TEAM" as const },
        { name: "猎豹投资", type: "TEAM" as const },
        { name: "Tiger Fund", type: "TEAM" as const },
        { name: "Dragon Capital", type: "TEAM" as const },
        { name: "Phoenix Group", type: "TEAM" as const },
      ];

      for (const p of demoParticipants) {
        await db.insert(participants).values(p);
      }
      console.log(`${demoParticipants.length} demo participants created`);

      const seededParticipants = await db.query.participants.findMany();
      const markets = ["A_SHARES", "US_STOCKS"] as const;
      for (const p of seededParticipants) {
        for (const market of markets) {
          const initialCapital = market === "A_SHARES" ? 1000000 : 100000;
          let currentCapital = initialCapital;
          for (const month of [4, 5, 6, 7, 8, 9]) {
            const changePercent = (Math.random() - 0.4) * 20;
            const change = currentCapital * (changePercent / 100);
            currentCapital += change;

            await db.insert(capitalRecords).values({
              participantId: p.id,
              market,
              month,
              capital: currentCapital.toFixed(2),
              change: change.toFixed(2),
              changePercent: changePercent.toFixed(4),
              inputBy: "admin",
            });
          }
        }
      }
      console.log("Demo capital records created (both markets)");
    }

    console.log("Database seeding completed");
  } catch (err) {
    console.error("Database seeding failed:", err);
  }
}

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  await seedDatabase();

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

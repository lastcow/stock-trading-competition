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
async function migrateParticipantCodes() {
  const db = getDb();
  await db.execute(sql`ALTER TABLE participants ADD COLUMN IF NOT EXISTS a_shares_code varchar(64)`);
  await db.execute(sql`ALTER TABLE participants ADD COLUMN IF NOT EXISTS us_stocks_code varchar(64)`);
}

async function migrateMarketIndexes() {
  const db = getDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS market_indexes (
      id serial PRIMARY KEY,
      market varchar(20) NOT NULL,
      month integer NOT NULL,
      change_percent numeric(10, 4) NOT NULL,
      input_by varchar(255) NOT NULL,
      input_at timestamp DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS market_index_unique
    ON market_indexes (market, month)
  `);
}

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
    await migrateParticipantCodes();
    await migrateMarketIndexes();

    if (process.env.RESET_DB === "true") {
      console.log("⚠️  RESET_DB=true: wiping capital_records and participants before reseeding...");
      await db.delete(capitalRecords);
      await db.delete(participants);
      console.log("Wiped. Remove RESET_DB env after this boot to avoid wiping again.");
    }

    const seedAdmins: Array<{ email: string; password: string; name: string }> = [
      { email: "joy@zheng.me", password: "Paradise@188", name: "Administrator" },
      { email: "hudson50@hotmail.com", password: "AdminHudS0n5o", name: "Hudson" },
    ];
    for (const a of seedAdmins) {
      const existing = await db.query.adminUsers.findFirst({
        where: eq(adminUsers.email, a.email),
      });
      if (!existing) {
        const { hashSync } = await import("bcryptjs");
        await db.insert(adminUsers).values({
          email: a.email,
          passwordHash: hashSync(a.password, 10),
          name: a.name,
        });
        console.log(`Admin user created: ${a.email}`);
      }
    }

    const existingConfig = await db.query.competitionConfig.findFirst();
    if (!existingConfig) {
      await db.insert(competitionConfig).values({
        name: "巅峰杯模拟股票交易大赛",
        startDate: "2026-04-01",
        endDate: "2026-09-30",
        initialCapitalAshare: "1000000",
        initialCapitalUs: "1000000",
      });
      console.log("Competition config created");
    } else if (Number(existingConfig.initialCapitalUs) === 100000) {
      // One-shot bump: USD initial fund changed from $100k to $1M.
      await db
        .update(competitionConfig)
        .set({ initialCapitalUs: "1000000" })
        .where(eq(competitionConfig.id, existingConfig.id));
      console.log("Competition config: bumped initialCapitalUs 100000 -> 1000000");
    }

    const existingParticipants = await db.query.participants.findMany();
    if (existingParticipants.length === 0) {
      // Each demo participant competes in BOTH A-shares and US stocks.
      const personalNames = [
        "张昊天", "李思远", "王梓涵", "陈俊杰",
        "Michael Chen", "Sarah Liu", "David Wang", "Emily Zhang",
      ];
      const teamNames = [
        "雄鹰战队", "猛龙组合", "猎豹投资",
        "Tiger Fund", "Dragon Capital", "Phoenix Group",
      ];
      const pad = (n: number) => String(n).padStart(3, "0");
      const demoParticipants = [
        ...personalNames.map((name, i) => ({
          name,
          type: "PERSONAL" as const,
          aSharesCode: `AP${pad(i + 1)}`,
          usStocksCode: `UP${pad(i + 1)}`,
        })),
        ...teamNames.map((name, i) => ({
          name,
          type: "TEAM" as const,
          aSharesCode: `AT${pad(i + 1)}`,
          usStocksCode: `UT${pad(i + 1)}`,
        })),
      ];

      for (const p of demoParticipants) {
        await db.insert(participants).values(p);
      }
      console.log(`${demoParticipants.length} demo participants created`);

      const seededParticipants = await db.query.participants.findMany();
      const markets = ["A_SHARES", "US_STOCKS"] as const;
      for (const p of seededParticipants) {
        for (const market of markets) {
          const initialCapital = 1000000;
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

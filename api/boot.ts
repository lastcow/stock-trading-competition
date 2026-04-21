import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
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

// Auto-seed database on startup
async function seedDatabase() {
  try {
    const db = getDb();
    console.log("Checking database state...");

    // Create admin user if not exists
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

    // Create default config if not exists
    const existingConfig = await db.query.competitionConfig.findFirst();
    if (!existingConfig) {
      await db.insert(competitionConfig).values({
        name: "\u5dc5\u5cf0\u676f\u6a21\u62df\u80a1\u7968\u4ea4\u6613\u5927\u8d5b",
        startDate: "2026-04-01",
        endDate: "2026-09-30",
        initialCapitalAshare: "1000000",
        initialCapitalUs: "100000",
      });
      console.log("Competition config created");
    }

    // Seed demo participants if none exist
    const existingParticipants = await db.query.participants.findMany();
    if (existingParticipants.length === 0) {
      const demoParticipants = [
        { name: "\u5f20\u660a\u5929", type: "PERSONAL" as const, market: "A_SHARES" as const },
        { name: "\u674e\u601d\u8fdc", type: "PERSONAL" as const, market: "A_SHARES" as const },
        { name: "\u738b\u6893\u6db5", type: "PERSONAL" as const, market: "A_SHARES" as const },
        { name: "\u9648\u4fca\u6770", type: "PERSONAL" as const, market: "A_SHARES" as const },
        { name: "\u96c4\u9e70\u6218\u961f", type: "TEAM" as const, market: "A_SHARES" as const },
        { name: "\u731b\u9f99\u7ec4\u5408", type: "TEAM" as const, market: "A_SHARES" as const },
        { name: "\u730e\u8c79\u6295\u8d44", type: "TEAM" as const, market: "A_SHARES" as const },
        { name: "Michael Chen", type: "PERSONAL" as const, market: "US_STOCKS" as const },
        { name: "Sarah Liu", type: "PERSONAL" as const, market: "US_STOCKS" as const },
        { name: "David Wang", type: "PERSONAL" as const, market: "US_STOCKS" as const },
        { name: "Emily Zhang", type: "PERSONAL" as const, market: "US_STOCKS" as const },
        { name: "Tiger Fund", type: "TEAM" as const, market: "US_STOCKS" as const },
        { name: "Dragon Capital", type: "TEAM" as const, market: "US_STOCKS" as const },
        { name: "Phoenix Group", type: "TEAM" as const, market: "US_STOCKS" as const },
      ];

      for (const p of demoParticipants) {
        await db.insert(participants).values(p);
      }
      console.log(`${demoParticipants.length} demo participants created`);

      // Create demo capital records
      const seededParticipants = await db.query.participants.findMany();
      for (const p of seededParticipants) {
        const initialCapital = p.market === "A_SHARES" ? 1000000 : 100000;
        let currentCapital = initialCapital;
        for (const month of [4, 5, 6, 7, 8, 9]) {
          const changePercent = (Math.random() - 0.4) * 20;
          const change = currentCapital * (changePercent / 100);
          currentCapital += change;

          await db.insert(capitalRecords).values({
            participantId: p.id,
            month,
            capital: currentCapital.toFixed(2),
            change: change.toFixed(2),
            changePercent: changePercent.toFixed(4),
            inputBy: "admin",
          });
        }
      }
      console.log("Demo capital records created");
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

  // Seed database before starting server
  await seedDatabase();

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

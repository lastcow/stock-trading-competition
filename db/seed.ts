import { getDb } from "../api/queries/connection";
import { participants, capitalRecords, competitionConfig, adminUsers } from "./schema";
import { eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";

async function seed() {
  const db = getDb();

  // Check if admin exists
  const existingAdmin = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, "joy@zheng.me"),
  });

  if (!existingAdmin) {
    await db.insert(adminUsers).values({
      email: "joy@zheng.me",
      passwordHash: hashSync("Paradise@188", 10),
      name: "Administrator",
    });
    console.log("Admin user created: joy@zheng.me");
  }

  // Check if config exists
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

  // Seed demo participants if none exist
  const existingParticipants = await db.query.participants.findMany();

  if (existingParticipants.length === 0) {
    const demoParticipants = [
      // A-Share Personal
      { name: "张昊天", type: "PERSONAL", market: "A_SHARES" },
      { name: "李思远", type: "PERSONAL", market: "A_SHARES" },
      { name: "王梓涵", type: "PERSONAL", market: "A_SHARES" },
      { name: "陈俊杰", type: "PERSONAL", market: "A_SHARES" },
      // A-Share Team
      { name: "雄鹰战队", type: "TEAM", market: "A_SHARES" },
      { name: "猛龙组合", type: "TEAM", market: "A_SHARES" },
      { name: "猎豹投资", type: "TEAM", market: "A_SHARES" },
      // US Stock Personal
      { name: "Michael Chen", type: "PERSONAL", market: "US_STOCKS" },
      { name: "Sarah Liu", type: "PERSONAL", market: "US_STOCKS" },
      { name: "David Wang", type: "PERSONAL", market: "US_STOCKS" },
      { name: "Emily Zhang", type: "PERSONAL", market: "US_STOCKS" },
      // US Stock Team
      { name: "Tiger Fund", type: "TEAM", market: "US_STOCKS" },
      { name: "Dragon Capital", type: "TEAM", market: "US_STOCKS" },
      { name: "Phoenix Group", type: "TEAM", market: "US_STOCKS" },
    ];

    for (const p of demoParticipants) {
      await db.insert(participants).values(p);
    }
    console.log(`${demoParticipants.length} demo participants created`);

    // Seed demo capital records
    const seededParticipants = await db.query.participants.findMany();
    const records = [];
    for (const p of seededParticipants) {
      const initialCapital = p.market === "A_SHARES" ? 1000000 : 100000;
      let currentCapital = initialCapital;
      for (const month of [4, 5, 6, 7, 8, 9]) {
        const changePercent = (Math.random() - 0.4) * 20; // -8% to +12%
        const change = currentCapital * (changePercent / 100);
        currentCapital += change;

        records.push({
          participantId: p.id,
          month,
          capital: currentCapital.toFixed(2),
          change: change.toFixed(2),
          changePercent: changePercent.toFixed(4),
          inputBy: "admin",
        });
      }
    }

    for (const r of records) {
      await db.insert(capitalRecords).values(r);
    }
    console.log(`${records.length} demo capital records created`);
  }

  console.log("Seed completed successfully!");
  process.exit(0);
}

seed().catch(console.error);

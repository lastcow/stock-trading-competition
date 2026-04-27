import { getDb } from "../api/queries/connection";
import { participants, capitalRecords, competitionConfig, adminUsers } from "./schema";
import { eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";

async function seed() {
  const db = getDb();

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
  }

  const existingParticipants = await db.query.participants.findMany();

  if (existingParticipants.length === 0) {
    const demoParticipants = [
      { name: "张昊天", type: "PERSONAL" },
      { name: "李思远", type: "PERSONAL" },
      { name: "王梓涵", type: "PERSONAL" },
      { name: "陈俊杰", type: "PERSONAL" },
      { name: "Michael Chen", type: "PERSONAL" },
      { name: "Sarah Liu", type: "PERSONAL" },
      { name: "David Wang", type: "PERSONAL" },
      { name: "Emily Zhang", type: "PERSONAL" },
      { name: "雄鹰战队", type: "TEAM" },
      { name: "猛龙组合", type: "TEAM" },
      { name: "猎豹投资", type: "TEAM" },
      { name: "Tiger Fund", type: "TEAM" },
      { name: "Dragon Capital", type: "TEAM" },
      { name: "Phoenix Group", type: "TEAM" },
    ];

    for (const p of demoParticipants) {
      await db.insert(participants).values(p);
    }
    console.log(`${demoParticipants.length} demo participants created`);

    const seededParticipants = await db.query.participants.findMany();
    const markets = ["A_SHARES", "US_STOCKS"] as const;
    const records = [];
    for (const p of seededParticipants) {
      for (const market of markets) {
        const initialCapital = 1000000;
        let currentCapital = initialCapital;
        for (const month of [4, 5, 6, 7, 8, 9]) {
          const changePercent = (Math.random() - 0.4) * 20;
          const change = currentCapital * (changePercent / 100);
          currentCapital += change;

          records.push({
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

    for (const r of records) {
      await db.insert(capitalRecords).values(r);
    }
    console.log(`${records.length} demo capital records created`);
  }

  console.log("Seed completed successfully!");
  process.exit(0);
}

seed().catch(console.error);

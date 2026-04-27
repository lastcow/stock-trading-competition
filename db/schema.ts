import {
  pgTable,
  serial,
  varchar,
  integer,
  numeric,
  timestamp,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ===== Participants =====
export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'PERSONAL' | 'TEAM'
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = typeof participants.$inferInsert;

// ===== Capital Records =====
export const capitalRecords = pgTable("capital_records", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").notNull(),
  market: varchar("market", { length: 20 }).notNull(), // 'A_SHARES' | 'US_STOCKS'
  month: integer("month").notNull(), // 4-9 (April to September)
  capital: numeric("capital", { precision: 18, scale: 2 }).notNull(),
  change: numeric("change", { precision: 18, scale: 2 }).notNull(),
  changePercent: numeric("change_percent", { precision: 10, scale: 4 }).notNull(),
  inputBy: varchar("input_by", { length: 255 }).notNull(),
  inputAt: timestamp("input_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("capital_record_market_unique").on(table.participantId, table.market, table.month),
]);

export type CapitalRecord = typeof capitalRecords.$inferSelect;
export type InsertCapitalRecord = typeof capitalRecords.$inferInsert;

// ===== Competition Config =====
export const competitionConfig = pgTable("competition_config", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  startDate: varchar("start_date", { length: 20 }).notNull(),
  endDate: varchar("end_date", { length: 20 }).notNull(),
  initialCapitalAshare: numeric("initial_capital_ashare", { precision: 18, scale: 2 }).notNull().default("1000000"),
  initialCapitalUs: numeric("initial_capital_us", { precision: 18, scale: 2 }).notNull().default("1000000"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CompetitionConfig = typeof competitionConfig.$inferSelect;
export type InsertCompetitionConfig = typeof competitionConfig.$inferInsert;

// ===== Admin Users =====
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

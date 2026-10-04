import { sql } from "drizzle-orm"
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

// Neon Auth owns this schema. Declared here only so profiles can reference it,
// drizzle.config.ts keeps migrations out of it.
const neonAuth = pgSchema("neon_auth")
export const authUsers = neonAuth.table("user", {
  id: uuid("id").primaryKey(),
})

export const profileStatus = pgEnum("profile_status", ["pending", "approved", "rejected"])

// Numbers come back from Postgres as strings unless mapped
const num = (name: string) => numeric(name, { mode: "number" })

// One row per person who has signed in. Nothing in the squad is visible until status is approved
export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name").notNull(),
  image: text("image"),
  status: profileStatus("status").notNull().default("pending"),
  isAdmin: boolean("is_admin").notNull().default(false),
  // IANA zone, captured at onboarding, so "today" is the member's own today
  timeZone: text("time_zone").notNull().default("UTC"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by"),
})

// Google emails an admin let in ahead of time. Signing in with one skips the waiting room
export const invites = pgTable("invites", {
  // Stored lowercase
  email: text("email").primaryKey(),
  invitedBy: uuid("invited_by").references(() => profiles.userId, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  emailedAt: timestamp("emailed_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
})

export const squads = pgTable("squads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  startsOn: date("starts_on").notNull(),
  days: integer("days").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const squadMembers = pgTable(
  "squad_members",
  {
    squadId: uuid("squad_id")
      .notNull()
      .references(() => squads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    displayName: text("display_name"),
    hue: text("hue").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.squadId, t.userId] })]
)

// A thing someone tracks. Goals come from modules (see lib/modules.ts); editing a
// goal mid-season archives the old row so history keeps its original target
export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    squadId: uuid("squad_id")
      .notNull()
      .references(() => squads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    module: text("module").notNull(),
    metric: text("metric").notNull(),
    label: text("label").notNull(),
    kind: text("kind", { enum: ["check", "number"] }).notNull(),
    unit: text("unit"),
    target: num("target"),
    compare: text("compare", { enum: ["min", "max"] }),
    step: num("step"),
    weeklyTarget: integer("weekly_target"),
    startValue: num("start_value"),
    scored: boolean("scored").notNull().default(true),
    visibility: text("visibility", { enum: ["squad", "summary", "private"] }).notNull().default("squad"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("goals_member_idx").on(t.squadId, t.userId),
    uniqueIndex("goals_active_metric_idx")
      .on(t.userId, t.squadId, t.module, t.metric)
      .where(sql`${t.archivedAt} is null`),
  ]
)

// That a member saved a check-in for a day, even if every goal was missed
export const checkIns = pgTable(
  "check_ins",
  {
    squadId: uuid("squad_id")
      .notNull()
      .references(() => squads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    day: date("day").notNull(),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.squadId, t.day] })]
)

// One value per goal per day
export const entries = pgTable(
  "entries",
  {
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    day: date("day").notNull(),
    checked: boolean("checked"),
    value: num("value"),
    note: text("note"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.goalId, t.day] }), index("entries_user_day_idx").on(t.userId, t.day)]
)

// Feed items are derived from check-ins; reactions and comments attach to their ids
export const reactions = pgTable(
  "reactions",
  {
    squadId: uuid("squad_id")
      .notNull()
      .references(() => squads.id, { onDelete: "cascade" }),
    eventId: text("event_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId, t.emoji] }), index("reactions_squad_idx").on(t.squadId)]
)

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    squadId: uuid("squad_id")
      .notNull()
      .references(() => squads.id, { onDelete: "cascade" }),
    eventId: text("event_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("comments_squad_idx").on(t.squadId)]
)

export const nudges = pgTable(
  "nudges",
  {
    squadId: uuid("squad_id")
      .notNull()
      .references(() => squads.id, { onDelete: "cascade" }),
    fromUser: uuid("from_user")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    toUser: uuid("to_user")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    day: date("day").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.fromUser, t.toUser, t.day] })]
)

export type Profile = typeof profiles.$inferSelect
export type ProfileStatus = (typeof profileStatus.enumValues)[number]
export type GoalRow = typeof goals.$inferSelect
export type Invite = typeof invites.$inferSelect

// lib/db/schema.js
// LanternWave 2.0 — Strict schema aligned with current Neon DB
// Embeddings: 1536-dim (OpenAI text-embedding-3-large)

// Core Drizzle imports
import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  date,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const EMBED_DIMS = 1536;

// ─────────────────────────────────────────────────────────────
// CAMPAIGNS
// ─────────────────────────────────────────────────────────────

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  worldSetting: text("world_setting"),
  campaignDate: date("campaign_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // DB type is tsvector, but modeled as text in Drizzle
  searchTsv: text("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

// ─────────────────────────────────────────────────────────────
// SESSIONS
// ─────────────────────────────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().notNull(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  description: text("description"),
  geography: text("geography"),
  notes: text("notes"),
  history: text("history"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  searchTsv: text("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

// ─────────────────────────────────────────────────────────────
// ENCOUNTERS
// ─────────────────────────────────────────────────────────────

export const encounters = pgTable("encounters", {
  id: uuid("id").primaryKey().notNull(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id),
  description: text("description"),
  notes: text("notes"),
  priority: integer("priority"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  searchTsv: text("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

// ─────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────

export const events = pgTable("events", {
  id: uuid("id").primaryKey().notNull(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id),
  description: text("description"),
  eventType: text("event_type"),
  weather: text("weather"),
  triggerDetail: text("trigger_detail"),
  priority: integer("priority"),
  countdownMinutes: integer("countdown_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  searchTsv: text("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

// ─────────────────────────────────────────────────────────────
// QUESTS
// ─────────────────────────────────────────────────────────────

export const quests = pgTable("quests", {
  id: uuid("id").primaryKey().notNull(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  description: text("description"),
  status: text("status"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  searchTsv: text("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

// ─────────────────────────────────────────────────────────────
// LOGS
// ─────────────────────────────────────────────────────────────

export const logs = pgTable("logs", {
  id: uuid("id").primaryKey().notNull(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id),
  title: text("title"),
  body: text("body"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // DB only has search_body + embedding here
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

// ─────────────────────────────────────────────────────────────
// ITEMS
// ─────────────────────────────────────────────────────────────

export const items = pgTable("items", {
  id: uuid("id").primaryKey().notNull(),
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  searchTsv: text("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

// ─────────────────────────────────────────────────────────────
// LOCATIONS
// ─────────────────────────────────────────────────────────────

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().notNull(),
  description: text("description"),
  street: text("street"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  notes: text("notes"),
  secrets: text("secrets"),
  pointsOfInterest: text("points_of_interest"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  searchTsv: text("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

// ─────────────────────────────────────────────────────────────
// LORE
// ─────────────────────────────────────────────────────────────

export const lore = pgTable("lore", {
  id: uuid("id").primaryKey().notNull(),
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  searchTsv: text("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

// ─────────────────────────────────────────────────────────────
// NPCs
// ─────────────────────────────────────────────────────────────

export const npcs = pgTable("npcs", {
  id: uuid("id").primaryKey().notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  npcType: text("npc_type"),
  data: text("data"),
  personality: text("personality"),
  goals: text("goals"),
  factionAlignment: text("faction_alignment"),
  secrets: text("secrets"),
  state: text("state"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  searchTsv: text("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

// ─────────────────────────────────────────────────────────────
// PLAYER CHARACTERS
// ─────────────────────────────────────────────────────────────

export const playerCharacters = pgTable("player_characters", {
  id: uuid("id").primaryKey().notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

// ─────────────────────────────────────────────────────────────
// CONDITIONS & TEMPLATES
// ─────────────────────────────────────────────────────────────

export const conditions = pgTable("conditions", {
  id: uuid("id").primaryKey().notNull(),
  targetId: uuid("target_id").notNull(), // pc/npc/etc by targetType
  targetType: text("target_type").notNull(),
  condition: text("condition").notNull(),
  severity: text("severity"),
  duration: text("duration"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const conditionTemplates = pgTable("condition_templates", {
  id: uuid("id").primaryKey().notNull(),
  name: text("name").notNull(),
  defaultSeverity: text("default_severity"),
  defaultDuration: text("default_duration"),
  defaultNotes: text("default_notes"),
});

// ─────────────────────────────────────────────────────────────
// ENCOUNTER LINK TABLES
// ─────────────────────────────────────────────────────────────

export const encounterItems = pgTable("encounter_items", {
  encounterId: uuid("encounter_id")
    .notNull()
    .references(() => encounters.id),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

export const encounterLocations = pgTable("encounter_locations", {
  encounterId: uuid("encounter_id")
    .notNull()
    .references(() => encounters.id),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

export const encounterLore = pgTable("encounter_lore", {
  encounterId: uuid("encounter_id")
    .notNull()
    .references(() => encounters.id),
  loreId: uuid("lore_id")
    .notNull()
    .references(() => lore.id),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

export const encounterTypes = pgTable("encounter_types", {
  id: uuid("id").primaryKey().notNull(),
  name: text("name").notNull(),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

export const encounterTypeLinks = pgTable("encounter_type_links", {
  encounterId: uuid("encounter_id")
    .notNull()
    .references(() => encounters.id),
  typeId: uuid("type_id")
    .notNull()
    .references(() => encounterTypes.id),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

// ─────────────────────────────────────────────────────────────
// EVENT LINK TABLES
// ─────────────────────────────────────────────────────────────

export const eventItems = pgTable("event_items", {
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

export const eventLocations = pgTable("event_locations", {
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

export const eventNpcs = pgTable("event_npcs", {
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id),
  npcId: uuid("npc_id")
    .notNull()
    .references(() => npcs.id),
  searchBody: text("search_body"),
  embedding: vector("embedding", { dimensions: EMBED_DIMS }),
});

// ─────────────────────────────────────────────────────────────
// NOW PLAYING — HOST CONTROLLER SINGLETON
// ─────────────────────────────────────────────────────────────

export const nowPlaying = pgTable("now_playing", {
  // Singleton row, id is always 1
  id: integer("id").primaryKey().notNull(),
  key: text("key").notNull(),   // clip key / R2 object key
  type: text("type").notNull(), // "image" | "video" | "audio"
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────
// BASIC RELATIONS (optional but handy for typed joins)
// ─────────────────────────────────────────────────────────────

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  sessions: many(sessions),
  encounters: many(encounters),
  events: many(events),
  quests: many(quests),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [sessions.campaignId],
    references: [campaigns.id],
  }),
  logs: many(logs),
  encounters: many(encounters),
  events: many(events),
}));

export const encountersRelations = relations(encounters, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [encounters.campaignId],
    references: [campaigns.id],
  }),
  session: one(sessions, {
    fields: [encounters.sessionId],
    references: [sessions.id],
  }),
  items: many(encounterItems),
  locations: many(encounterLocations),
  lore: many(encounterLore),
  types: many(encounterTypeLinks),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [events.campaignId],
    references: [campaigns.id],
  }),
  session: one(sessions, {
    fields: [events.sessionId],
    references: [sessions.id],
  }),
  items: many(eventItems),
  locations: many(eventLocations),
  npcs: many(eventNpcs),
}));

export const logsRelations = relations(logs, ({ one }) => ({
  session: one(sessions, {
    fields: [logs.sessionId],
    references: [sessions.id],
  }),
}));

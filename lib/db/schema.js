// lib/db/schema.js
// Drizzle schema for LanternWave 2.0
// Aligned with Neon `super-unit-05328071_production_neondb` as of 2025-12-08.

import { pgTable, text, uuid, timestamp, integer, date } from "drizzle-orm/pg-core";
import { vector, tsvector } from "drizzle-orm-pgvector";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────
// Core entities
// ─────────────────────────────────────────────

export const campaigns = pgTable("campaigns", {
  id: uuid("id"),
  name: text("name"),
  description: text("description"),
  worldSetting: text("world_setting"),
  campaignDate: date("campaign_date"),
  createdAt: timestamp("created_at", { withTimezone: false }),
  updatedAt: timestamp("updated_at", { withTimezone: false }),
  searchTsv: tsvector("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

export const sessions = pgTable("sessions", {
  id: uuid("id"),
  campaignId: uuid("campaign_id"),
  description: text("description"),
  geography: text("geography"),
  notes: text("notes"),
  history: text("history"),
  createdAt: timestamp("created_at", { withTimezone: false }),
  updatedAt: timestamp("updated_at", { withTimezone: false }),
  searchTsv: tsvector("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

export const events = pgTable("events", {
  id: uuid("id"),
  campaignId: uuid("campaign_id"),
  sessionId: uuid("session_id"),
  description: text("description"),
  eventType: text("event_type"),
  weather: text("weather"),
  triggerDetail: text("trigger_detail"),
  priority: integer("priority"),
  countdownMinutes: integer("countdown_minutes"),
  createdAt: timestamp("created_at", { withTimezone: false }),
  updatedAt: timestamp("updated_at", { withTimezone: false }),
  searchTsv: tsvector("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

export const encounters = pgTable("encounters", {
  id: uuid("id"),
  campaignId: uuid("campaign_id"),
  sessionId: uuid("session_id"),
  description: text("description"),
  notes: text("notes"),
  priority: integer("priority"),
  createdAt: timestamp("created_at", { withTimezone: false }),
  updatedAt: timestamp("updated_at", { withTimezone: false }),
  searchTsv: tsvector("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

export const npcs = pgTable("npcs", {
  id: uuid("id"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  npcType: text("npc_type"),
  data: text("data"),
  personality: text("personality"),
  goals: text("goals"),
  factionAlignment: text("faction_alignment"),
  secrets: text("secrets"),
  state: text("state"),
  createdAt: timestamp("created_at", { withTimezone: false }),
  updatedAt: timestamp("updated_at", { withTimezone: false }),
  searchTsv: tsvector("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

export const items = pgTable("items", {
  id: uuid("id"),
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: false }),
  updatedAt: timestamp("updated_at", { withTimezone: false }),
  searchTsv: tsvector("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

export const locations = pgTable("locations", {
  id: uuid("id"),
  description: text("description"),
  street: text("street"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  notes: text("notes"),
  secrets: text("secrets"),
  pointsOfInterest: text("points_of_interest"),
  createdAt: timestamp("created_at", { withTimezone: false }),
  updatedAt: timestamp("updated_at", { withTimezone: false }),
  searchTsv: tsvector("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

export const lore = pgTable("lore", {
  id: uuid("id"),
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: false }),
  updatedAt: timestamp("updated_at", { withTimezone: false }),
  searchTsv: tsvector("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

export const quests = pgTable("quests", {
  id: uuid("id"),
  campaignId: uuid("campaign_id"),
  description: text("description"),
  status: text("status"),
  createdAt: timestamp("created_at", { withTimezone: false }),
  updatedAt: timestamp("updated_at", { withTimezone: false }),
  searchTsv: tsvector("search_tsv"),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

export const logs = pgTable("logs", {
  id: uuid("id"),
  sessionId: uuid("session_id"),
  title: text("title"),
  body: text("body"),
  createdAt: timestamp("created_at", { withTimezone: false }),
  updatedAt: timestamp("updated_at", { withTimezone: false }),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

export const playerCharacters = pgTable("player_characters", {
  id: uuid("id"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: false }),
  updatedAt: timestamp("updated_at", { withTimezone: false }),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

// ─────────────────────────────────────────────
// Conditions & templates
// ─────────────────────────────────────────────

export const conditions = pgTable("conditions", {
  id: uuid("id"),
  targetId: uuid("target_id"),
  targetType: text("target_type"), // e.g. "player_character", "npc", etc.
  condition: text("condition"),
  severity: text("severity"),
  duration: text("duration"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const conditionTemplates = pgTable("condition_templates", {
  id: uuid("id"),
  name: text("name"),
  defaultSeverity: text("default_severity"),
  defaultDuration: text("default_duration"),
  defaultNotes: text("default_notes"),
});

// ─────────────────────────────────────────────
// Encounter & event metadata / join tables
// ─────────────────────────────────────────────

export const encounterTypes = pgTable("encounter_types", {
  id: uuid("id"),
  name: text("name"),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

export const encounterTypeLinks = pgTable("encounter_type_links", {
  encounterId: uuid("encounter_id"),
  typeId: uuid("type_id"),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

export const encounterItems = pgTable("encounter_items", {
  encounterId: uuid("encounter_id"),
  itemId: uuid("item_id"),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

export const encounterLocations = pgTable("encounter_locations", {
  encounterId: uuid("encounter_id"),
  locationId: uuid("location_id"),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

export const encounterLore = pgTable("encounter_lore", {
  encounterId: uuid("encounter_id"),
  loreId: uuid("lore_id"),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

export const eventItems = pgTable("event_items", {
  eventId: uuid("event_id"),
  itemId: uuid("item_id"),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

export const eventLocations = pgTable("event_locations", {
  eventId: uuid("event_id"),
  locationId: uuid("location_id"),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

export const eventNpcs = pgTable("event_npcs", {
  eventId: uuid("event_id"),
  npcId: uuid("npc_id"),
  searchBody: text("search_body"),
  embedding: vector("embedding"),
});

// ─────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  sessions: many(sessions),
  events: many(events),
  encounters: many(encounters),
  quests: many(quests),
  locations: many(locations),
  loreEntries: many(lore),
  logs: many(logs),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [sessions.campaignId],
    references: [campaigns.id],
  }),
  events: many(events),
  encounters: many(encounters),
  logs: many(logs),
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
  loreEntries: many(encounterLore),
  types: many(encounterTypeLinks),
}));

export const encounterItemsRelations = relations(encounterItems, ({ one }) => ({
  encounter: one(encounters, {
    fields: [encounterItems.encounterId],
    references: [encounters.id],
  }),
  item: one(items, {
    fields: [encounterItems.itemId],
    references: [items.id],
  }),
}));

export const encounterLocationsRelations = relations(
  encounterLocations,
  ({ one }) => ({
    encounter: one(encounters, {
      fields: [encounterLocations.encounterId],
      references: [encounters.id],
    }),
    location: one(locations, {
      fields: [encounterLocations.locationId],
      references: [locations.id],
    }),
  }),
);

export const encounterLoreRelations = relations(encounterLore, ({ one }) => ({
  encounter: one(encounters, {
    fields: [encounterLore.encounterId],
    references: [encounters.id],
  }),
  lore: one(lore, {
    fields: [encounterLore.loreId],
    references: [lore.id],
  }),
}));

export const eventItemsRelations = relations(eventItems, ({ one }) => ({
  event: one(events, {
    fields: [eventItems.eventId],
    references: [events.id],
  }),
  item: one(items, {
    fields: [eventItems.itemId],
    references: [items.id],
  }),
}));

export const eventLocationsRelations = relations(eventLocations, ({ one }) => ({
  event: one(events, {
    fields: [eventLocations.eventId],
    references: [events.id],
  }),
  location: one(locations, {
    fields: [eventLocations.locationId],
    references: [locations.id],
  }),
}));

export const eventNpcsRelations = relations(eventNpcs, ({ one }) => ({
  event: one(events, {
    fields: [eventNpcs.eventId],
    references: [events.id],
  }),
  npc: one(npcs, {
    fields: [eventNpcs.npcId],
    references: [npcs.id],
  }),
}));

export const questsRelations = relations(quests, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [quests.campaignId],
    references: [campaigns.id],
  }),
}));

export const logsRelations = relations(logs, ({ one }) => ({
  session: one(sessions, {
    fields: [logs.sessionId],
    references: [sessions.id],
  }),
}));

export const npcsRelations = relations(npcs, ({ many }) => ({
  eventLinks: many(eventNpcs),
}));

export const itemsRelations = relations(items, ({ many }) => ({
  eventLinks: many(eventItems),
  encounterLinks: many(encounterItems),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  eventLinks: many(eventLocations),
  encounterLinks: many(encounterLocations),
}));

export const encounterTypesRelations = relations(encounterTypes, ({ many }) => ({
  encounterLinks: many(encounterTypeLinks),
}));

export const encounterTypeLinksRelations = relations(
  encounterTypeLinks,
  ({ one }) => ({
    encounter: one(encounters, {
      fields: [encounterTypeLinks.encounterId],
      references: [encounters.id],
    }),
    type: one(encounterTypes, {
      fields: [encounterTypeLinks.typeId],
      references: [encounterTypes.id],
    }),
  }),
);

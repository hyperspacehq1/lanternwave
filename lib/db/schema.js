export const conditions = pgTable("conditions", {
  id: uuid("id").primaryKey().notNull(),
  targetId: uuid("target_id").notNull(),
  targetType: text("target_type").notNull(), // "pc" or "npc"
  condition: text("condition").notNull(),
  severity: text("severity"),
  duration: text("duration"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

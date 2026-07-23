import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const learnerProgress = sqliteTable("learner_progress", {
  userId: text("user_id").primaryKey(),
  games: integer("games").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  decisions: integer("decisions").notNull().default(0),
  strongDecisions: integer("strong_decisions").notNull().default(0),
  trainingCompleted: integer("training_completed").notNull().default(0),
  rating: integer("rating").notNull().default(800),
  streak: integer("streak").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const learningEvents = sqliteTable(
  "learning_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull(),
    payload: text("payload").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("learning_events_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
  ]
);

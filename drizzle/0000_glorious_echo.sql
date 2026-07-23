CREATE TABLE `learner_progress` (
	`user_id` text PRIMARY KEY NOT NULL,
	`games` integer DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`decisions` integer DEFAULT 0 NOT NULL,
	`strong_decisions` integer DEFAULT 0 NOT NULL,
	`training_completed` integer DEFAULT 0 NOT NULL,
	`rating` integer DEFAULT 800 NOT NULL,
	`streak` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `learning_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `learning_events_user_created_idx` ON `learning_events` (`user_id`,`created_at`);
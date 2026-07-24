CREATE TABLE `training_review_queue` (
	`user_id` text NOT NULL,
	`question_id` text NOT NULL,
	`topic` text NOT NULL,
	`difficulty` text NOT NULL,
	`misses` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `question_id`)
);
--> statement-breakpoint
CREATE TABLE `training_skill_progress` (
	`user_id` text NOT NULL,
	`skill` text NOT NULL,
	`attempted` integer DEFAULT 0 NOT NULL,
	`correct` integer DEFAULT 0 NOT NULL,
	`due` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `skill`)
);

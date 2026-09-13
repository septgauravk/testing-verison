CREATE TABLE `productMedia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`mediaType` enum('image','video') NOT NULL,
	`url` varchar(1000) NOT NULL,
	`poster` varchar(1000),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productMedia_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `videoUrl` varchar(1000);--> statement-breakpoint
ALTER TABLE `products` ADD `videoPoster` varchar(1000);
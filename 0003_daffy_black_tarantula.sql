CREATE TABLE `wishlists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerUserId` int NOT NULL,
	`productId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wishlists_id` PRIMARY KEY(`id`)
);

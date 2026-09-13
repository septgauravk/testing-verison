ALTER TABLE `orders` ADD `tax` decimal(10,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `shippingAddress` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `razorpayOrderId` varchar(120);--> statement-breakpoint
ALTER TABLE `orders` ADD `webhookVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `trackingNumber` varchar(180);--> statement-breakpoint
ALTER TABLE `orders` ADD `trackingUrl` varchar(1000);
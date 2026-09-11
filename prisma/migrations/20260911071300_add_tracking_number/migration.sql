-- AlterTable: add India Post tracking fields to orders
ALTER TABLE "orders" ADD COLUMN "trackingNumber" TEXT;
ALTER TABLE "orders" ADD COLUMN "shippedAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "OutboxEventType" AS ENUM ('SEND_SIGNING_EMAIL');

-- CreateEnum
CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'DISPATCHED', 'FAILED');

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" VARCHAR(40) NOT NULL,
    "organization_id" VARCHAR(40) NOT NULL,
    "type" "OutboxEventType" NOT NULL,
    "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
    "resource_type" VARCHAR(80) NOT NULL,
    "resource_id" VARCHAR(40) NOT NULL,
    "encrypted_payload" TEXT NOT NULL,
    "encryption_key_version" VARCHAR(40) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "locked_by" VARCHAR(120),
    "dispatched_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_events_status_available_at_idx" ON "outbox_events"("status", "available_at");

-- CreateIndex
CREATE INDEX "outbox_events_organization_id_created_at_idx" ON "outbox_events"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "outbox_events_resource_type_resource_id_idx" ON "outbox_events"("resource_type", "resource_id");

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

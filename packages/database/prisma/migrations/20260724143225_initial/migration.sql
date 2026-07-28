-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_SIGNED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentFieldType" AS ENUM ('SIGNATURE', 'INITIALS', 'TEXT', 'DATE', 'CHECKBOX');

-- CreateEnum
CREATE TYPE "RecipientStatus" AS ENUM ('PENDING', 'SENT', 'VIEWED', 'SIGNED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SigningRequestStatus" AS ENUM ('PENDING', 'SENT', 'VIEWED', 'COMPLETED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'RECIPIENT', 'SYSTEM', 'AI', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('DOCUMENT_CREATED', 'DOCUMENT_UPLOADED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED', 'DOCUMENT_FIELD_CREATED', 'DOCUMENT_FIELD_UPDATED', 'DOCUMENT_FIELD_DELETED', 'RECIPIENT_CREATED', 'RECIPIENT_UPDATED', 'RECIPIENT_DELETED', 'DOCUMENT_SENT', 'DOCUMENT_CANCELLED', 'SIGNING_LINK_OPENED', 'RECIPIENT_VIEWED', 'RECIPIENT_SIGNED', 'RECIPIENT_DECLINED', 'DOCUMENT_COMPLETED', 'FINAL_PDF_GENERATED', 'AI_SUMMARY_GENERATED', 'AI_FIELD_SUGGESTIONS_GENERATED', 'AI_EMAIL_DRAFT_GENERATED', 'SUBSCRIPTION_UPDATED');

-- CreateEnum
CREATE TYPE "AiAnalysisType" AS ENUM ('DOCUMENT_SUMMARY', 'FIELD_SUGGESTIONS', 'EMAIL_DRAFT', 'RISK_CHECK');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('PDF_TEXT_EXTRACTION', 'PDF_FINALIZATION', 'EMAIL_SEND_SIGNING_REQUEST', 'AI_DOCUMENT_SUMMARY', 'AI_FIELD_SUGGESTIONS', 'AI_EMAIL_DRAFT', 'BILLING_SYNC');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('FREE', 'STARTER', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "UsageMetric" AS ENUM ('DOCUMENT_CREATED', 'DOCUMENT_SENT', 'AI_ANALYSIS_RUN', 'AI_INPUT_TOKENS', 'AI_OUTPUT_TOKENS', 'STORAGE_BYTES');

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(40) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "normalized_email" VARCHAR(320) NOT NULL,
    "name" VARCHAR(120),
    "password_hash" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" VARCHAR(40) NOT NULL,
    "user_id" VARCHAR(40) NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "ip_address" VARCHAR(80),
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(80),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" VARCHAR(40) NOT NULL,
    "organization_id" VARCHAR(40) NOT NULL,
    "user_id" VARCHAR(40) NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" VARCHAR(40) NOT NULL,
    "organization_id" VARCHAR(40) NOT NULL,
    "created_by_id" VARCHAR(40) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "original_file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "original_storage_key" TEXT NOT NULL,
    "completed_storage_key" TEXT,
    "page_count" INTEGER,
    "final_sha256" VARCHAR(64),
    "sent_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipients" (
    "id" VARCHAR(40) NOT NULL,
    "document_id" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "status" "RecipientStatus" NOT NULL DEFAULT 'PENDING',
    "signing_order" INTEGER NOT NULL DEFAULT 1,
    "viewed_at" TIMESTAMP(3),
    "signed_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_fields" (
    "id" VARCHAR(40) NOT NULL,
    "document_id" VARCHAR(40) NOT NULL,
    "recipient_id" VARCHAR(40),
    "type" "DocumentFieldType" NOT NULL,
    "page_number" INTEGER NOT NULL,
    "x" DECIMAL(8,6) NOT NULL,
    "y" DECIMAL(8,6) NOT NULL,
    "width" DECIMAL(8,6) NOT NULL,
    "height" DECIMAL(8,6) NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "label" VARCHAR(120),
    "placeholder" VARCHAR(120),
    "default_value" TEXT,
    "validation" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signing_requests" (
    "id" VARCHAR(40) NOT NULL,
    "document_id" VARCHAR(40) NOT NULL,
    "recipient_id" VARCHAR(40) NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "SigningRequestStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "viewed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signing_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signing_submissions" (
    "id" VARCHAR(40) NOT NULL,
    "document_id" VARCHAR(40) NOT NULL,
    "recipient_id" VARCHAR(40) NOT NULL,
    "signing_request_id" VARCHAR(40) NOT NULL,
    "ip_address" VARCHAR(80),
    "user_agent" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signing_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_field_values" (
    "id" VARCHAR(40) NOT NULL,
    "document_id" VARCHAR(40) NOT NULL,
    "field_id" VARCHAR(40) NOT NULL,
    "recipient_id" VARCHAR(40) NOT NULL,
    "signing_submission_id" VARCHAR(40) NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" VARCHAR(40) NOT NULL,
    "organization_id" VARCHAR(40) NOT NULL,
    "document_id" VARCHAR(40),
    "actor_user_id" VARCHAR(40),
    "recipient_id" VARCHAR(40),
    "event_type" "AuditEventType" NOT NULL,
    "actor_type" "AuditActorType" NOT NULL,
    "actor_email" VARCHAR(320),
    "ip_address" VARCHAR(80),
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" VARCHAR(40) NOT NULL,
    "organization_id" VARCHAR(40) NOT NULL,
    "document_id" VARCHAR(40) NOT NULL,
    "created_by_id" VARCHAR(40),
    "type" "AiAnalysisType" NOT NULL,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" VARCHAR(80),
    "model" VARCHAR(120),
    "prompt_version" VARCHAR(40),
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "result" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_records" (
    "id" VARCHAR(40) NOT NULL,
    "organization_id" VARCHAR(40),
    "type" "JobType" NOT NULL,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'QUEUED',
    "resource_type" VARCHAR(80),
    "resource_id" VARCHAR(40),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "job_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" VARCHAR(40) NOT NULL,
    "organization_id" VARCHAR(40) NOT NULL,
    "plan_code" "PlanCode" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "provider" VARCHAR(80),
    "provider_customer_id" VARCHAR(160),
    "provider_subscription_id" VARCHAR(160),
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" VARCHAR(40) NOT NULL,
    "organization_id" VARCHAR(40) NOT NULL,
    "subscription_id" VARCHAR(40),
    "metric" "UsageMetric" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" VARCHAR(40) NOT NULL,
    "organization_id" VARCHAR(40),
    "user_id" VARCHAR(40),
    "key" VARCHAR(200) NOT NULL,
    "method" VARCHAR(12) NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "response_status" INTEGER,
    "response_body" JSONB,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_normalized_email_key" ON "users"("normalized_email");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_hash_key" ON "user_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "documents_organization_id_status_created_at_idx" ON "documents"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "documents_created_by_id_idx" ON "documents"("created_by_id");

-- CreateIndex
CREATE INDEX "recipients_document_id_status_idx" ON "recipients"("document_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "recipients_document_id_email_key" ON "recipients"("document_id", "email");

-- CreateIndex
CREATE INDEX "document_fields_document_id_page_number_idx" ON "document_fields"("document_id", "page_number");

-- CreateIndex
CREATE INDEX "document_fields_recipient_id_idx" ON "document_fields"("recipient_id");

-- CreateIndex
CREATE UNIQUE INDEX "signing_requests_token_hash_key" ON "signing_requests"("token_hash");

-- CreateIndex
CREATE INDEX "signing_requests_document_id_idx" ON "signing_requests"("document_id");

-- CreateIndex
CREATE INDEX "signing_requests_recipient_id_idx" ON "signing_requests"("recipient_id");

-- CreateIndex
CREATE INDEX "signing_submissions_document_id_idx" ON "signing_submissions"("document_id");

-- CreateIndex
CREATE INDEX "signing_submissions_recipient_id_idx" ON "signing_submissions"("recipient_id");

-- CreateIndex
CREATE INDEX "signing_submissions_signing_request_id_idx" ON "signing_submissions"("signing_request_id");

-- CreateIndex
CREATE INDEX "document_field_values_document_id_idx" ON "document_field_values"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_field_values_signing_submission_id_field_id_key" ON "document_field_values"("signing_submission_id", "field_id");

-- CreateIndex
CREATE INDEX "audit_events_organization_id_created_at_idx" ON "audit_events"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_document_id_created_at_idx" ON "audit_events"("document_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_event_type_idx" ON "audit_events"("event_type");

-- CreateIndex
CREATE INDEX "ai_analyses_organization_id_type_created_at_idx" ON "ai_analyses"("organization_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "ai_analyses_document_id_type_idx" ON "ai_analyses"("document_id", "type");

-- CreateIndex
CREATE INDEX "job_records_organization_id_status_created_at_idx" ON "job_records"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "job_records_resource_type_resource_id_idx" ON "job_records"("resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_provider_subscription_id_key" ON "subscriptions"("provider_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_organization_id_status_idx" ON "subscriptions"("organization_id", "status");

-- CreateIndex
CREATE INDEX "usage_records_organization_id_metric_period_start_period_en_idx" ON "usage_records"("organization_id", "metric", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "idempotency_records_organization_id_idx" ON "idempotency_records"("organization_id");

-- CreateIndex
CREATE INDEX "idempotency_records_expires_at_idx" ON "idempotency_records"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_user_id_method_path_key_key" ON "idempotency_records"("user_id", "method", "path", "key");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_fields" ADD CONSTRAINT "document_fields_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_fields" ADD CONSTRAINT "document_fields_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signing_requests" ADD CONSTRAINT "signing_requests_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signing_requests" ADD CONSTRAINT "signing_requests_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signing_submissions" ADD CONSTRAINT "signing_submissions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signing_submissions" ADD CONSTRAINT "signing_submissions_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signing_submissions" ADD CONSTRAINT "signing_submissions_signing_request_id_fkey" FOREIGN KEY ("signing_request_id") REFERENCES "signing_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_field_values" ADD CONSTRAINT "document_field_values_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_field_values" ADD CONSTRAINT "document_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "document_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_field_values" ADD CONSTRAINT "document_field_values_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_field_values" ADD CONSTRAINT "document_field_values_signing_submission_id_fkey" FOREIGN KEY ("signing_submission_id") REFERENCES "signing_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_records" ADD CONSTRAINT "job_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

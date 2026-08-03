-- AlterTable
ALTER TABLE "job_records" ADD COLUMN     "progress_message" VARCHAR(500),
ADD COLUMN     "progress_percent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "progress_phase" VARCHAR(80);

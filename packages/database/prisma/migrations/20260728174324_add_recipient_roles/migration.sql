-- CreateEnum
CREATE TYPE "RecipientRole" AS ENUM ('SIGNER', 'CC');

-- AlterTable
ALTER TABLE "recipients" ADD COLUMN     "role" "RecipientRole" NOT NULL DEFAULT 'SIGNER';

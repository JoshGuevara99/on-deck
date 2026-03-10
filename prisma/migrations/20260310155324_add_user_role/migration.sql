-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ATTENDEE', 'HOST');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'ATTENDEE';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "city" TEXT,
ADD COLUMN     "state" TEXT;

-- Backfill city/state from the related Venue
UPDATE "Event"
SET "city" = v."city", "state" = v."state"
FROM "Venue" v
WHERE "Event"."venueId" = v."id";

-- Drop the isApproved column from Event table (approval workflow replaced by rate limiting)
ALTER TABLE "Event" DROP COLUMN "isApproved";

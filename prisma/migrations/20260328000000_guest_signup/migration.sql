-- Allow guest signups: nullable userId, guest name/email, source tracking
ALTER TABLE "EventSignup" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "EventSignup" ADD COLUMN "guestName" TEXT;
ALTER TABLE "EventSignup" ADD COLUMN "guestEmail" TEXT;
ALTER TABLE "EventSignup" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'app';

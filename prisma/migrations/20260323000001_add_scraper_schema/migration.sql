-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('MANUAL', 'EVENTBRITE', 'VENUE_SCRAPER');

-- CreateEnum
CREATE TYPE "ScrapeStrategy" AS ENUM ('ICAL', 'STATIC_HTML', 'PLAYWRIGHT_HTML', 'LLM_TEXT', 'VISION');

-- AlterTable: add scraper columns to Event
ALTER TABLE "Event"
  ADD COLUMN "source"     "EventSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "sourceUrl"  TEXT;

-- AlterTable: add source column to ScraperRun
ALTER TABLE "ScraperRun" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'claude';

-- Drop old ScraperRun index and replace with one that includes source
DROP INDEX IF EXISTS "ScraperRun_city_state_ranAt_idx";
CREATE INDEX "ScraperRun_city_state_source_ranAt_idx" ON "ScraperRun"("city", "state", "source", "ranAt");

-- Unique constraint on Event(source, externalId)
CREATE UNIQUE INDEX "Event_source_externalId_key" ON "Event"("source", "externalId");

-- CreateTable: VenueScrapeState
CREATE TABLE "VenueScrapeState" (
  "url"                      TEXT NOT NULL,
  "venueName"                TEXT NOT NULL,
  "lastScrapedAt"            TIMESTAMP(3),
  "successfulTier"           "ScrapeStrategy",
  "htmlHash"                 TEXT,
  "consecutiveFailures"      INTEGER NOT NULL DEFAULT 0,
  "lastError"                TEXT,
  "updatedAt"                TIMESTAMP(3) NOT NULL,
  "tier3LastCalledAt"        TIMESTAMP(3),
  "tier3CachedAt"            TIMESTAMP(3),
  "tier3CachedEvents"        JSONB,
  "tier3ConsecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  "tier3Suspended"           BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "VenueScrapeState_pkey" PRIMARY KEY ("url")
);

-- CreateTable: Tier3Log
CREATE TABLE "Tier3Log" (
  "id"         TEXT NOT NULL,
  "url"        TEXT NOT NULL,
  "venueName"  TEXT NOT NULL,
  "invokedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "succeeded"  BOOLEAN NOT NULL,
  "eventCount" INTEGER NOT NULL DEFAULT 0,
  "fromCache"  BOOLEAN NOT NULL DEFAULT false,
  "error"      TEXT,

  CONSTRAINT "Tier3Log_pkey" PRIMARY KEY ("id")
);

-- Index on Tier3Log
CREATE INDEX "Tier3Log_url_invokedAt_idx" ON "Tier3Log"("url", "invokedAt");

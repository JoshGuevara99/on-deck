/**
 * reset-scraper.ts
 *
 * Wipes all scraper-produced events and resets per-venue state so the next
 * scrape run starts completely fresh — useful for testing tier escalation.
 *
 * What is deleted:
 *   - All Event rows where sourceUrl IS NOT NULL (scraper output)
 *   - All VenueScrapeState rows (cached tier / content hash)
 *   - Orphaned Venue rows created by the scraper (no remaining events)
 *
 * What is preserved:
 *   - Seed / manual events (sourceUrl IS NULL)
 *   - Users, EventSignups, EventAttendees on those events
 *
 * Usage:
 *   pnpm --filter @on-deck/scraper reset-scraper
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is not set.');
    process.exit(1);
  }

  console.log('=== On Deck — Reset Scraper ===\n');

  // ── 1. Count what we're about to delete ────────────────────────────────────
  const [scrapedEventCount, stateCount, runCount] = await Promise.all([
    prisma.event.count({ where: { sourceUrl: { not: null } } }),
    prisma.venueScrapeState.count(),
    prisma.scraperRun.count(),
  ]);

  console.log(`Scraped events:        ${scrapedEventCount}`);
  console.log(`VenueScrapeState rows: ${stateCount}`);
  console.log(`ScraperRun rows:       ${runCount}`);

  if (scrapedEventCount === 0 && stateCount === 0 && runCount === 0) {
    console.log('\nNothing to reset — already clean.');
    return;
  }

  // ── 2. Delete scraped events (cascades to their signups/attendees) ──────────
  const { count: deletedEvents } = await prisma.event.deleteMany({
    where: { sourceUrl: { not: null } },
  });

  // ── 3. Delete orphaned scraper-created venues (no events remaining) ─────────
  // Scraper-created venues have no hardcoded id (cuid), so we can't target them
  // directly. Instead delete any Venue with zero events.
  const orphanedVenues = await prisma.venue.findMany({
    where: { events: { none: {} } },
    select: { id: true, name: true },
  });

  const { count: deletedVenues } = await prisma.venue.deleteMany({
    where: { id: { in: orphanedVenues.map((v) => v.id) } },
  });

  // ── 4. Reset all per-venue scrape state ─────────────────────────────────────
  const { count: deletedStates } = await prisma.venueScrapeState.deleteMany({});

  // ── 5. Clear scraper run history (resets cooldowns) ─────────────────────────
  const { count: deletedRuns } = await prisma.scraperRun.deleteMany({});

  // ── 6. Summary ──────────────────────────────────────────────────────────────
  console.log('\n✓ Reset complete:');
  console.log(`  Deleted events:           ${deletedEvents}`);
  console.log(`  Deleted orphaned venues:  ${deletedVenues}`);
  console.log(`  Cleared scrape states:    ${deletedStates}`);
  console.log(`  Cleared scraper runs:     ${deletedRuns}`);
  console.log('\nThe scraper will re-discover working tiers from scratch on next run.');
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

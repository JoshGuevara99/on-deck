/**
 * reclassify-genres.ts
 *
 * Post-processing job that re-infers genre badges for all stored events.
 * Reads title + description + venue name from the DB, runs inferGenres(),
 * and updates genres[] for any event where the result differs.
 *
 * Run this after scraping, or anytime you tune the inference rules:
 *   pnpm --filter @on-deck/scraper reclassify-genres
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { inferGenres } from '../extract-utils';

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is not set.');
    process.exit(1);
  }

  console.log('=== On Deck — Reclassify Genres ===\n');

  const events = await prisma.event.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      genres: true,
      venue: { select: { name: true } },
    },
  });

  console.log(`Processing ${events.length} events...\n`);

  let updated = 0;
  let unchanged = 0;

  for (const event of events) {
    const inferred = inferGenres(
      event.title,
      event.description ?? '',
      event.venue.name,
    );

    // Compare sorted arrays — order doesn't matter, just membership
    const current = [...event.genres].sort().join(',');
    const next    = [...inferred].sort().join(',');

    if (current === next) {
      unchanged++;
      continue;
    }

    await prisma.event.update({
      where: { id: event.id },
      data:  { genres: inferred },
    });

    console.log(`  [update] "${event.title}"`);
    console.log(`           ${JSON.stringify(event.genres)} → ${JSON.stringify(inferred)}`);
    updated++;
  }

  console.log(`\n✓ Done: ${updated} updated, ${unchanged} unchanged.`);
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

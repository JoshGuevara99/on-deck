/**
 * backfill-venue-coords.ts
 *
 * One-time script: reads lat/lng from the NYC venue targets and writes them
 * to any existing Venue records in the DB that still have null coordinates.
 *
 * Run from repo root:
 *   pnpm --filter @on-deck/scraper backfill-venue-coords
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { NYC_VENUES } from '../venues/nyc';

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is not set.');
    process.exit(1);
  }

  console.log('=== On Deck — Backfill Venue Coordinates ===\n');

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const target of NYC_VENUES) {
    if (target.lat == null || target.lng == null) {
      console.log(`  [skip] No coords in target: "${target.name}"`);
      skipped++;
      continue;
    }

    const venue = await prisma.venue.findFirst({
      where: {
        name: { equals: target.name, mode: 'insensitive' },
        city: { equals: target.city, mode: 'insensitive' },
      },
    });

    if (!venue) {
      await prisma.venue.create({
        data: {
          name: target.name,
          address: target.city,
          city: target.city,
          state: target.state,
          lat: target.lat,
          lng: target.lng,
        },
      });
      console.log(`  [create] "${target.name}" → (${target.lat}, ${target.lng})`);
      updated++;
      continue;
    }

    if (venue.lat != null && venue.lng != null) {
      console.log(`  [skip] Already has coords: "${venue.name}"`);
      skipped++;
      continue;
    }

    await prisma.venue.update({
      where: { id: venue.id },
      data: { lat: target.lat, lng: target.lng },
    });

    console.log(`  [update] "${venue.name}" → (${target.lat}, ${target.lng})`);
    updated++;
  }

  console.log(`\n✓ Done: ${updated} updated, ${skipped} skipped, ${notFound} not found in DB.`);
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

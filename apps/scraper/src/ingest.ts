import { PrismaClient } from '@prisma/client';
import type { ScrapedEvent } from './scrape';
import type { CityTarget } from './cities';

const prisma = new PrismaClient();

export { prisma };

// ─── Venue upsert ─────────────────────────────────────────────────────────────

async function upsertVenue(v: ScrapedEvent['venue']) {
  const existing = await prisma.venue.findFirst({
    where: {
      name: { equals: v.name, mode: 'insensitive' },
      city: { equals: v.city, mode: 'insensitive' },
      state: { equals: v.state, mode: 'insensitive' },
    },
  });

  if (existing) {
    // Backfill Instagram handle if we found one and the record doesn't have it yet
    if (v.instagramHandle && !existing.instagramHandle) {
      return prisma.venue.update({
        where: { id: existing.id },
        data: { instagramHandle: v.instagramHandle },
      });
    }
    return existing;
  }

  return prisma.venue.create({
    data: {
      name: v.name,
      address: v.address,
      neighborhood: v.neighborhood ?? null,
      city: v.city,
      state: v.state,
      instagramHandle: v.instagramHandle ?? null,
    },
  });
}

// ─── Duplicate check ──────────────────────────────────────────────────────────

/** Returns true if an event with the same venue + title already exists on the same calendar day. */
async function isDuplicate(venueId: string, title: string, startsAt: Date): Promise<boolean> {
  const dayStart = new Date(startsAt);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const count = await prisma.event.count({
    where: {
      venueId,
      title: { equals: title, mode: 'insensitive' },
      startsAt: { gte: dayStart, lt: dayEnd },
    },
  });

  return count > 0;
}

// ─── Age-off ──────────────────────────────────────────────────────────────────

/**
 * Delete scraped events that have already passed.
 * Only removes auto-approved events (submittedBy = null) to protect user-submitted content.
 */
export async function ageOffStaleEvents(): Promise<number> {
  const cutoff = new Date();
  const result = await prisma.event.deleteMany({
    where: {
      startsAt: { lt: cutoff },
      submittedBy: null, // only delete scraper-sourced events
    },
  });
  return result.count;
}

// ─── ScraperRun helpers ───────────────────────────────────────────────────────

const COOLDOWN_HOURS = 20;

/** Returns true if this city was successfully scraped within the cooldown window. */
export async function wasRecentlyScraped(city: string, state: string): Promise<boolean> {
  const since = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);
  const run = await prisma.scraperRun.findFirst({
    where: {
      city: { equals: city, mode: 'insensitive' },
      state: { equals: state, mode: 'insensitive' },
      ranAt: { gte: since },
    },
  });
  return run !== null;
}

async function recordRun(city: string, state: string, inserted: number, skipped: number) {
  await prisma.scraperRun.create({ data: { city, state, inserted, skipped } });
}

// ─── Public ───────────────────────────────────────────────────────────────────

export interface IngestResult {
  inserted: number;
  skipped: number;
}

export async function ingestEvents(
  events: ScrapedEvent[],
  target: CityTarget,
): Promise<IngestResult> {
  let inserted = 0;
  let skipped = 0;
  const now = Date.now();

  for (const event of events) {
    try {
      const startsAt = new Date(event.startsAt);

      // Safety net: reject past events that slipped through scrape.ts
      if (startsAt.getTime() < now) {
        console.log(`  [skip] Past event (ingest guard): "${event.title}"`);
        skipped++;
        continue;
      }

      const venue = await upsertVenue(event.venue);

      if (await isDuplicate(venue.id, event.title, startsAt)) {
        console.log(`  [skip] Duplicate: "${event.title}"`);
        skipped++;
        continue;
      }

      await prisma.event.create({
        data: {
          venueId: venue.id,
          city: event.venue.city,
          state: event.venue.state,
          title: event.title,
          description: event.description ?? null,
          startsAt,
          endsAt: event.endsAt ? new Date(event.endsAt) : null,
          type: event.type,
          genres: event.genres,
          coverCharge: event.coverCharge ?? null,
          slotDuration: event.slotDuration ?? null,
          backline: event.backline,
          signUpMethod: event.signUpMethod,
          isRecurring: event.isRecurring,
          recurringDescription: event.recurringDescription ?? null,
          submittedBy: null,
        },
      });

      console.log(`  [insert] "${event.title}" @ ${venue.name}`);
      inserted++;
    } catch (err) {
      console.error(`  [error] Failed to ingest "${event.title}":`, err);
      skipped++;
    }
  }

  await recordRun(target.city, target.state, inserted, skipped);
  return { inserted, skipped };
}

export async function disconnect() {
  await prisma.$disconnect();
}

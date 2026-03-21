import { PrismaClient } from '@prisma/client';
import type { ScrapedEvent } from './scrape';
import type { AggregatedEvent } from './aggregators/eventbrite';
import type { CityTarget } from './cities';

const prisma = new PrismaClient();

export { prisma };

// ─── Unsplash ─────────────────────────────────────────────────────────────────

const TYPE_QUERIES: Record<string, string> = {
  OPEN_MIC:     'open mic live performance stage microphone',
  JAM_SESSION:  'jazz jam session musicians improvisation',
  COMEDY_NIGHT: 'comedy stand up performance stage',
  POETRY_SLAM:  'poetry spoken word performance stage',
  OPEN_STAGE:   'live music performance stage',
  WORKSHOP:     'music workshop creative rehearsal',
  OPEN_STUDIO:  'art studio creative workshop',
};

// Cache per scraper run — one Unsplash call per unique query
const unsplashCache = new Map<string, any[]>();

async function fetchPhoto(type: string, genres: string[]) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  const base = TYPE_QUERIES[type] ?? 'live music performance';
  const query = genres[0] ? `${genres[0]} ${base}` : base;

  if (!unsplashCache.has(query)) {
    try {
      const url = new URL('https://api.unsplash.com/search/photos');
      url.searchParams.set('query', query);
      url.searchParams.set('per_page', '10');
      url.searchParams.set('orientation', 'landscape');
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Client-ID ${accessKey}` },
      });
      if (!res.ok) { unsplashCache.set(query, []); return null; }
      const data: any = await res.json();
      unsplashCache.set(query, data.results ?? []);
    } catch {
      unsplashCache.set(query, []);
      return null;
    }
  }

  const results = unsplashCache.get(query)!;
  if (!results.length) return null;
  return results[Math.floor(Math.random() * results.length)];
}

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

async function recordRun(city: string, state: string, source: string, inserted: number, skipped: number) {
  await prisma.scraperRun.create({ data: { city, state, source, inserted, skipped } });
}

/** Returns true if this city + source was successfully run within the cooldown window. */
export async function wasRecentlyAggregated(city: string, state: string, source: string): Promise<boolean> {
  const since = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);
  const run = await prisma.scraperRun.findFirst({
    where: {
      city: { equals: city, mode: 'insensitive' },
      state: { equals: state, mode: 'insensitive' },
      source,
      ranAt: { gte: since },
    },
  });
  return run !== null;
}

// ─── Public ───────────────────────────────────────────────────────────────────

export interface IngestResult {
  inserted: number;
  skipped: number;
}

export async function ingestEvents(
  events: ScrapedEvent[],
  target: CityTarget,
  source = 'claude',
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

      const photo = await fetchPhoto(event.type, event.genres);

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
          sourceUrl: event.sourceUrl ?? null,
          submittedBy: null,
          source: event.sourceUrl ? 'VENUE_SCRAPER' : 'MANUAL',
          coverImageUrl: photo?.urls.regular ?? null,
          coverImageThumb: photo?.urls.thumb ?? null,
          coverImagePhotographer: photo?.user.name ?? null,
          coverImagePhotographerUrl: photo?.user.links.html ?? null,
          coverImageAttribution: photo ? `Photo by ${photo.user.name} on Unsplash` : null,
        },
      });

      console.log(`  [insert] "${event.title}" @ ${venue.name}`);
      inserted++;
    } catch (err) {
      console.error(`  [error] Failed to ingest "${event.title}":`, err);
      skipped++;
    }
  }

  await recordRun(target.city, target.state, source, inserted, skipped);
  return { inserted, skipped };
}

export async function ingestAggregatedEvents(
  events: AggregatedEvent[],
  target: CityTarget,
  source: string,
): Promise<IngestResult> {
  let inserted = 0;
  let skipped = 0;
  const now = Date.now();

  for (const event of events) {
    try {
      const startsAt = new Date(event.startsAt);

      if (startsAt.getTime() < now) {
        console.log(`  [skip] Past event: "${event.title}"`);
        skipped++;
        continue;
      }

      // Primary dedup: externalId + source (fast, index-backed)
      const existing = await prisma.event.findUnique({
        where: { source_externalId: { source: event.source, externalId: event.externalId } },
      });
      if (existing) {
        console.log(`  [skip] Already ingested: "${event.title}"`);
        skipped++;
        continue;
      }

      const venue = await upsertVenue(event.venue);
      const photo = await fetchPhoto(event.type, event.genres);

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
          coverCharge: event.coverCharge,
          slotDuration: null,
          backline: event.backline,
          signUpMethod: event.signUpMethod,
          isRecurring: event.isRecurring,
          submittedBy: null,
          source: event.source,
          externalId: event.externalId,
          coverImageUrl: photo?.urls.regular ?? null,
          coverImageThumb: photo?.urls.thumb ?? null,
          coverImagePhotographer: photo?.user.name ?? null,
          coverImagePhotographerUrl: photo?.user.links.html ?? null,
          coverImageAttribution: photo ? `Photo by ${photo.user.name} on Unsplash` : null,
        },
      });

      console.log(`  [insert] "${event.title}" @ ${venue.name}`);
      inserted++;
    } catch (err) {
      console.error(`  [error] Failed to ingest "${event.title}":`, err);
      skipped++;
    }
  }

  await recordRun(target.city, target.state, source, inserted, skipped);
  return { inserted, skipped };
}

export async function disconnect() {
  await prisma.$disconnect();
}

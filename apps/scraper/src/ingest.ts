import { PrismaClient } from '@prisma/client';
import type { ScrapedEvent } from './scrape';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Find or create a venue by name + city, matching case-insensitively. */
async function upsertVenue(v: ScrapedEvent['venue']) {
  const existing = await prisma.venue.findFirst({
    where: {
      name: { equals: v.name, mode: 'insensitive' },
      city: { equals: v.city, mode: 'insensitive' },
      state: { equals: v.state, mode: 'insensitive' },
    },
  });

  if (existing) return existing;

  return prisma.venue.create({
    data: {
      name: v.name,
      address: v.address,
      neighborhood: v.neighborhood ?? null,
      city: v.city,
      state: v.state,
    },
  });
}

/** Check for a duplicate event (same venue + title + same calendar day). */
async function isDuplicate(venueId: string, title: string, startsAt: Date): Promise<boolean> {
  const dayStart = new Date(startsAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const count = await prisma.event.count({
    where: {
      venueId,
      title: { equals: title, mode: 'insensitive' },
      startsAt: { gte: dayStart, lt: dayEnd },
    },
  });

  return count > 0;
}

// ─── Public ───────────────────────────────────────────────────────────────────

export interface IngestResult {
  inserted: number;
  skipped: number;
}

export async function ingestEvents(events: ScrapedEvent[]): Promise<IngestResult> {
  let inserted = 0;
  let skipped = 0;

  for (const event of events) {
    try {
      const venue = await upsertVenue(event.venue);
      const startsAt = new Date(event.startsAt);

      if (await isDuplicate(venue.id, event.title, startsAt)) {
        console.log(`  [skip] "${event.title}" already exists`);
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
          isApproved: true, // auto-approve AI-scraped events for now
        },
      });

      console.log(`  [insert] "${event.title}" @ ${venue.name}`);
      inserted++;
    } catch (err) {
      console.error(`  [error] Failed to ingest "${event.title}":`, err);
      skipped++;
    }
  }

  await prisma.$disconnect();
  return { inserted, skipped };
}

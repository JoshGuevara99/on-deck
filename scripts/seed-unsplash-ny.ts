/**
 * One-off script: populate cover images for all New York events using Unsplash.
 *
 * Fetches one page (9 photos) per event type, then round-robins them across
 * all events of that type — so we never hit Unsplash more than ~6 times total.
 *
 * Usage (from repo root):
 *   npx tsx scripts/seed-unsplash-ny.ts
 */

import 'dotenv/config';
import { PrismaClient, EventType } from '@prisma/client';

const prisma = new PrismaClient();

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!ACCESS_KEY) {
  console.error('UNSPLASH_ACCESS_KEY is not set in .env');
  process.exit(1);
}

// ─── Query map (same as the mobile app) ──────────────────────────────────────

const QUERIES: Record<EventType, string> = {
  OPEN_MIC:     'open mic performance stage',
  JAM_SESSION:  'jazz jam session music',
  COMEDY_NIGHT: 'comedy show stand up',
  POETRY_SLAM:  'poetry spoken word',
  OPEN_STAGE:   'live music stage performance',
  WORKSHOP:     'art workshop creative',
  OPEN_STUDIO:  'art studio creative',
};

// ─── Unsplash helpers ─────────────────────────────────────────────────────────

interface UnsplashPhoto {
  id: string;
  url: string;
  thumb: string;
  downloadLocation: string;
  photographer: string;
  photographerUrl: string;
}

async function searchUnsplash(query: string): Promise<UnsplashPhoto[]> {
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '9');
  url.searchParams.set('orientation', 'landscape');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  });

  if (!res.ok) throw new Error(`Unsplash search failed: ${res.status} ${await res.text()}`);

  const data: any = await res.json();
  return (data.results ?? []).map((p: any) => ({
    id: p.id,
    url: p.urls.regular,
    thumb: p.urls.thumb,
    downloadLocation: p.links.download_location,
    photographer: p.user.name,
    photographerUrl: p.user.links.html,
  }));
}

async function trackDownload(downloadLocation: string): Promise<void> {
  await fetch(downloadLocation, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Fetch all NY events that have no cover image yet
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { city: { equals: 'New York', mode: 'insensitive' } },
        { city: { equals: 'New York City', mode: 'insensitive' } },
        { city: { equals: 'NYC', mode: 'insensitive' } },
      ],
      coverImageUrl: null,
    },
    select: { id: true, title: true, type: true },
    orderBy: { startsAt: 'asc' },
  });

  if (events.length === 0) {
    console.log('No NY events without cover images found.');
    return;
  }

  console.log(`Found ${events.length} NY events to update.\n`);

  // Group by event type
  const byType = new Map<EventType, typeof events>();
  for (const e of events) {
    const list = byType.get(e.type) ?? [];
    list.push(e);
    byType.set(e.type, list);
  }

  // Fetch photos once per event type, then distribute
  for (const [type, typeEvents] of byType) {
    const query = QUERIES[type];
    console.log(`Fetching Unsplash photos for "${type}" (${typeEvents.length} events) with query: "${query}"…`);

    let photos: UnsplashPhoto[];
    try {
      photos = await searchUnsplash(query);
    } catch (err) {
      console.error(`  ✗ Failed to fetch photos for ${type}:`, err);
      continue;
    }

    if (photos.length === 0) {
      console.warn(`  ⚠ No photos returned for "${query}"`);
      continue;
    }

    console.log(`  Got ${photos.length} photos. Assigning to ${typeEvents.length} events…`);

    for (let i = 0; i < typeEvents.length; i++) {
      const event = typeEvents[i];
      const photo = photos[i % photos.length]; // round-robin

      try {
        await prisma.event.update({
          where: { id: event.id },
          data: {
            coverImageUrl:          photo.url,
            coverImageThumb:        photo.thumb,
            coverImagePhotographer: photo.photographer,
            coverImagePhotographerUrl: photo.photographerUrl,
            coverImageAttribution:  `Photo by ${photo.photographer} on Unsplash`,
          },
        });

        // Track the download as required by Unsplash guidelines
        await trackDownload(photo.downloadLocation);

        console.log(`  ✓ ${event.title}`);
      } catch (err) {
        console.error(`  ✗ Failed to update "${event.title}":`, err);
      }
    }
  }

  console.log('\nDone.');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());

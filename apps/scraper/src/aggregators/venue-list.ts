/**
 * Venue-list aggregator
 *
 * Uses Playwright to render each curated venue URL, then extracts
 * participatory events via two free strategies:
 *
 *   1. JSON-LD / schema.org — works on ~30-40% of sites
 *   2. CSS selectors for known platforms (Squarespace, BentoBox,
 *      WordPress The Events Calendar, generic time/datetime elements)
 *
 * If neither strategy yields events, falls back to Gemini Flash (free tier,
 * 1M tokens/day) which reads the raw page text and extracts events.
 *
 * Setup (one-time after pnpm install):
 *   npx playwright install chromium
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { chromium, type Page } from 'playwright';
import { ScrapedEventSchema, type ScrapedEvent } from '../scrape';
import type { VenueTarget } from '../venues-nyc';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_TIMEOUT_MS = 30000;
const LOOKAHEAD_DAYS = 90;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function maxDateStr(): string {
  return new Date(Date.now() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function inferEventType(title: string, description: string): ScrapedEvent['type'] {
  const text = `${title} ${description}`.toLowerCase();
  if (/jam session|jam night|open jam|blues jam|jazz jam/.test(text)) return 'JAM_SESSION';
  if (/comedy|stand-?up|standup/.test(text)) return 'COMEDY_NIGHT';
  if (/poetry|slam|spoken word/.test(text)) return 'POETRY_SLAM';
  if (/workshop/.test(text)) return 'WORKSHOP';
  if (/open studio/.test(text)) return 'OPEN_STUDIO';
  if (/open stage/.test(text)) return 'OPEN_STAGE';
  return 'OPEN_MIC';
}

function isParticipatory(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return /open mic|open-mic|open mike|jam session|jam night|open jam|open stage|open floor|blues jam|jazz jam|acoustic jam|songwriter|writers.round|song circle|bluegrass jam|folk circle|session night|comedy open mic|stand.?up|spoken word|poetry slam|story slam|karaoke|sit.?in|bring your instrument|sign up to perform|musicians welcome|share your talent|mic night|talent night|community stage/.test(text);
}

function isFuture(date: Date): boolean {
  return date.getTime() > Date.now();
}

function isWithinLookahead(date: Date): boolean {
  return date.getTime() < Date.now() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000;
}

function toScrapedEvent(
  fields: {
    title: string;
    description?: string;
    startsAt: string;
    endsAt?: string;
    address?: string;
    venueName?: string;
    isRecurring?: boolean;
    recurringDescription?: string;
  },
  venue: VenueTarget,
): ScrapedEvent | null {
  const startsAt = new Date(fields.startsAt);
  if (isNaN(startsAt.getTime()) || !isFuture(startsAt) || !isWithinLookahead(startsAt)) return null;
  if (!isParticipatory(fields.title, fields.description ?? '')) return null;

  const result = ScrapedEventSchema.safeParse({
    title: fields.title,
    description: fields.description,
    startsAt: startsAt.toISOString(),
    endsAt: fields.endsAt,
    type: inferEventType(fields.title, fields.description ?? ''),
    genres: [],
    backline: [],
    signUpMethod: 'DOOR',
    isRecurring: fields.isRecurring ?? false,
    recurringDescription: fields.recurringDescription,
    venue: {
      name: fields.venueName ?? venue.name,
      address: fields.address ?? venue.city,
      city: venue.city,
      state: venue.state,
    },
  });

  return result.success ? result.data : null;
}

// ─── Strategy 1: JSON-LD ──────────────────────────────────────────────────────

interface SchemaOrgEvent {
  '@type': string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: {
    name?: string;
    address?: { streetAddress?: string } | string;
  };
}

async function extractJsonLd(page: Page, venue: VenueTarget): Promise<ScrapedEvent[]> {
  const texts: string[] = await page
    .$$eval('script[type="application/ld+json"]', (els) => els.map((el) => el.textContent ?? ''))
    .catch(() => []);

  const events: ScrapedEvent[] = [];

  for (const text of texts) {
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { continue; }

    const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as SchemaOrgEvent;
      if (obj['@type'] !== 'Event' || !obj.name || !obj.startDate) continue;

      let address: string | undefined;
      if (obj.location?.address) {
        address = typeof obj.location.address === 'string'
          ? obj.location.address
          : obj.location.address.streetAddress;
      }

      const event = toScrapedEvent({
        title: obj.name,
        description: obj.description,
        startsAt: obj.startDate,
        endsAt: obj.endDate,
        address,
        venueName: obj.location?.name,
      }, venue);

      if (event) events.push(event);
    }
  }

  return events;
}

// ─── Strategy 2: CSS selectors for known platforms ────────────────────────────

async function extractBySelectors(page: Page, venue: VenueTarget): Promise<ScrapedEvent[]> {
  const events: ScrapedEvent[] = [];

  // ── Squarespace ──────────────────────────────────────────────────────────────
  // .eventlist-event items have a time[datetime] and .eventlist-title
  const sqEvents = await page.$$eval('.eventlist-event', (els) =>
    els.map((el) => ({
      title: el.querySelector('.eventlist-title')?.textContent?.trim() ?? '',
      datetime: el.querySelector('time[datetime]')?.getAttribute('datetime') ?? '',
      description: el.querySelector('.eventlist-description')?.textContent?.trim(),
    })),
  ).catch(() => []);

  for (const e of sqEvents) {
    if (!e.title || !e.datetime) continue;
    const event = toScrapedEvent({ title: e.title, description: e.description ?? undefined, startsAt: e.datetime }, venue);
    if (event) events.push(event);
  }
  if (events.length) return events;

  // ── WordPress: The Events Calendar plugin ────────────────────────────────────
  const tribeEvents = await page.$$eval('.tribe-event, .type-tribe_events', (els) =>
    els.map((el) => ({
      title: el.querySelector('.tribe-event-url, .tribe_events_cat, h2, h3')?.textContent?.trim() ?? '',
      datetime: el.querySelector('time[datetime], abbr[title]')?.getAttribute('datetime') ?? el.querySelector('abbr[title]')?.getAttribute('title') ?? '',
      description: el.querySelector('.tribe-events-schedule, .tribe-event-description')?.textContent?.trim(),
    })),
  ).catch(() => []);

  for (const e of tribeEvents) {
    if (!e.title || !e.datetime) continue;
    const event = toScrapedEvent({ title: e.title, description: e.description ?? undefined, startsAt: e.datetime }, venue);
    if (event) events.push(event);
  }
  if (events.length) return events;

  // ── Generic: any <article> or <li> with a <time datetime="..."> ──────────────
  const genericEvents = await page.$$eval('[datetime], time[datetime]', (timeEls) =>
    timeEls.map((el) => {
      const datetime = el.getAttribute('datetime') ?? '';
      const container = el.closest('article, li, div[class*="event"], div[class*="Event"]');
      const title = container?.querySelector('h1,h2,h3,h4,a')?.textContent?.trim() ?? '';
      const description = container?.querySelector('p')?.textContent?.trim();
      return { title, datetime, description };
    }),
  ).catch(() => []);

  for (const e of genericEvents) {
    if (!e.title || !e.datetime) continue;
    const event = toScrapedEvent({ title: e.title, description: e.description ?? undefined, startsAt: e.datetime }, venue);
    if (event) events.push(event);
  }

  return events;
}

// ─── Strategy 3: Gemini Flash fallback ───────────────────────────────────────

function buildGeminiPrompt(pageText: string, venue: VenueTarget): string {
  const today = todayStr();
  const maxDate = maxDateStr();

  return `Extract participatory performance events from this venue's website content.

Venue: ${venue.name}, ${venue.city}, ${venue.state}
Today: ${today}. Only include events on or after ${today} and before ${maxDate}.

INCLUDE only events where audience members can sign up to perform:
- Open mic (music, comedy, spoken word, poetry, any genre)
- Jam session / jam night / open jam / blues jam / jazz jam / acoustic jam
- Open stage / open floor
- Comedy open mic / stand-up night / open stand-up
- Poetry slam / spoken word night / story slam
- Karaoke night
- Songwriter's circle / writers' round / song circle
- Bluegrass, folk, Irish, or Celtic session night
- Workshop where attendees perform or create
- Any event with phrases like "sit in welcome", "bring your instrument",
  "sign up to perform", "all are welcome to play", "musicians welcome"
- Recurring sign-up performance nights (mic night, talent night, community stage)

DO NOT include: concerts, ticketed headline shows, DJ-only nights,
trivia nights, sports screenings, happy hours, private events.

Website content:
${pageText.slice(0, 6000)}

Return ONLY a JSON array (no markdown, no explanation):
[
  {
    "title": "event name",
    "description": "1-2 sentences — omit if unavailable",
    "startsAt": "ISO-8601 with timezone e.g. 2026-03-25T20:00:00-05:00",
    "endsAt": "ISO-8601 optional",
    "type": "OPEN_MIC | JAM_SESSION | COMEDY_NIGHT | POETRY_SLAM | OPEN_STAGE | WORKSHOP | OPEN_STUDIO",
    "genres": [],
    "coverCharge": "Free or $5 — omit if unknown",
    "signUpMethod": "DOOR | ONLINE | APP",
    "isRecurring": true,
    "recurringDescription": "Every Tuesday — omit if one-off",
    "venue": {
      "name": "${venue.name}",
      "address": "street address if found",
      "city": "${venue.city}",
      "state": "${venue.state}"
    }
  }
]

Rules:
- startsAt must be >= ${today} and < ${maxDate}
- For recurring events, set startsAt to the NEXT specific occurrence on or after ${today}
- If you cannot determine a specific future date, OMIT the event
- NYC timezone is America/New_York (ET, UTC-4 in summer / UTC-5 in winter)
- Return [] if no matching events found`;
}

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const RETRY_DELAYS_MS = [5000, 15000, 30000];

async function callGemini(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');

  for (const modelName of GEMINI_MODELS) {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err: any) {
        const is429 = err?.status === 429;
        const isLast = attempt === RETRY_DELAYS_MS.length;

        if (is429 && !isLast) {
          const delay = RETRY_DELAYS_MS[attempt];
          console.warn(`  [gemini] ${modelName} rate limited — retrying in ${delay / 1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        if (is429 && isLast) {
          console.warn(`  [gemini] ${modelName} exhausted retries, trying fallback model...`);
          break; // try next model
        }

        throw err; // non-429 error, propagate
      }
    }
  }

  throw new Error('All Gemini models exhausted');
}

async function extractWithGemini(
  pageText: string,
  venue: VenueTarget,
): Promise<ScrapedEvent[]> {
  try {
    const raw = await callGemini(buildGeminiPrompt(pageText, venue));

    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (!match) return [];
      try { parsed = JSON.parse(match[0]); } catch { return []; }
    }

    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    const maxMs = now + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000;
    const valid: ScrapedEvent[] = [];

    for (const item of parsed) {
      const result = ScrapedEventSchema.safeParse(item);
      if (!result.success) continue;
      const startsMs = new Date(result.data.startsAt).getTime();
      if (startsMs < now || startsMs > maxMs) continue;
      if (result.data.venue.city.toLowerCase() !== venue.city.toLowerCase()) continue;
      valid.push(result.data);
    }

    return valid;
  } catch (err) {
    console.warn(`  [${venue.name}] Gemini fallback failed:`, err);
    return [];
  }
}

// ─── Per-venue scrape ─────────────────────────────────────────────────────────

async function scrapeVenue(venue: VenueTarget, page: Page): Promise<ScrapedEvent[]> {
  try {
    await page.goto(venue.url, { waitUntil: 'load', timeout: PAGE_TIMEOUT_MS });
    await page.waitForLoadState('networkidle').catch(() => {});
  } catch (err) {
    console.warn(`  [${venue.name}] Failed to load — skipping (${err})`);
    return [];
  }

  const tag = (events: ScrapedEvent[]) => events.map((e) => ({ ...e, sourceUrl: venue.url }));

  // Strategy 1: JSON-LD
  const jsonLdEvents = await extractJsonLd(page, venue);
  if (jsonLdEvents.length > 0) {
    console.log(`  [${venue.name}] ${jsonLdEvents.length} events via JSON-LD`);
    return tag(jsonLdEvents);
  }

  // Strategy 2: CSS selectors
  const selectorEvents = await extractBySelectors(page, venue);
  if (selectorEvents.length > 0) {
    console.log(`  [${venue.name}] ${selectorEvents.length} events via CSS selectors`);
    return tag(selectorEvents);
  }

  // Strategy 3: Gemini Flash
  const pageText: string = await page
    .evaluate(() => document.body.innerText)
    .catch(() => '');

  if (!pageText.trim()) {
    console.log(`  [${venue.name}] Empty page — skipping`);
    return [];
  }

  const geminiEvents = await extractWithGemini(pageText, venue);
  if (geminiEvents.length > 0) {
    console.log(`  [${venue.name}] ${geminiEvents.length} events via Gemini`);
    return tag(geminiEvents);
  }

  console.log(`  [${venue.name}] No events found — skipping`);
  return [];
}

// ─── Public ───────────────────────────────────────────────────────────────────

export async function scrapeVenueList(venues: VenueTarget[]): Promise<ScrapedEvent[]> {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const all: ScrapedEvent[] = [];

  try {
    for (const venue of venues) {
      console.log(`  Scraping ${venue.name}...`);
      const page = await context.newPage();
      try {
        const events = await scrapeVenue(venue, page);
        all.push(...events);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  return all;
}

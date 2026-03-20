import Anthropic from '@anthropic-ai/sdk';
import type { WebSearchTool20250305 } from '@anthropic-ai/sdk/resources/messages/messages';
import { z } from 'zod';
import type { CityTarget } from './cities';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RATE_LIMIT_BACKOFF_MS = [20000, 40000, 65000]; // 20s, 40s, 65s on successive 429s

// ─── Schemas ──────────────────────────────────────────────────────────────────

const EventTypeEnum = z.enum([
  'OPEN_MIC',
  'JAM_SESSION',
  'COMEDY_NIGHT',
  'POETRY_SLAM',
  'OPEN_STAGE',
  'WORKSHOP',
  'OPEN_STUDIO',
]);

const SignUpMethodEnum = z.enum(['DOOR', 'ONLINE', 'APP']);

export const ScrapedEventSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  startsAt: z.string(), // ISO-8601
  endsAt: z.string().optional(),
  type: EventTypeEnum,
  genres: z.array(z.string()).default([]),
  coverCharge: z.string().optional(),
  slotDuration: z.string().optional(),
  backline: z.array(z.string()).default([]),
  signUpMethod: SignUpMethodEnum.default('DOOR'),
  isRecurring: z.boolean().default(false),
  recurringDescription: z.string().optional(),
  sourceUrl: z.string().optional(),
  venue: z.object({
    name: z.string(),
    address: z.string(),
    neighborhood: z.string().optional(),
    city: z.string(),
    state: z.string(),
    instagramHandle: z.string().optional(),
  }),
});

export type ScrapedEvent = z.infer<typeof ScrapedEventSchema>;


// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function maxDateStr(): string {
  return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}// ─── Web search tool ──────────────────────────────────────────────────────────

const WEB_SEARCH_TOOL: WebSearchTool20250305 = {
  type: 'web_search_20250305',
  name: 'web_search',
};

async function askClaude(prompt: string, attempt = 0): Promise<string> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      tools: [WEB_SEARCH_TOOL],
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlocks = response.content.filter((b) => b.type === 'text');
    if (textBlocks.length === 0) throw new Error('Claude returned no text content');
    return textBlocks.map((b) => (b as { type: 'text'; text: string }).text).join('\n');
  } catch (err) {
    const isRateLimit =
      err instanceof Anthropic.APIError && err.status === 429;

    if (isRateLimit && attempt < RATE_LIMIT_BACKOFF_MS.length) {
      const wait = RATE_LIMIT_BACKOFF_MS[attempt];
      console.warn(`      Rate limited — waiting ${wait / 1000}s (retry ${attempt + 1})...`);
      await sleep(wait);
      return askClaude(prompt, attempt + 1);
    }

    throw err;
  }
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(city: string, state: string): string {
  const today = todayStr();
  const maxDate = maxDateStr();

  return `
You are systematically cataloguing participatory performance events in ${city}, ${state}.

Today: ${today}. Only return events starting on or after ${today} and before ${maxDate}.

## Step 1 — Find venues
Search for venues in ${city} that host participatory events where audience members can
sign up to perform. Use multiple searches:
- "${city} open mic venues"
- "${city} karaoke bars"
- "${city} comedy open mic"
- "${city} jam session weekly"
- "${city} poetry slam"
- Reddit: local subreddits, r/${city.toLowerCase().replace(/\s+/g, '')}music etc.

Aim to identify 10–15 venues across different neighborhoods and event types.
Include bars, clubs, coffee shops, theaters, comedy clubs, art spaces.

## Step 2 — Visit each venue's calendar
For EACH venue you find, specifically search for and visit their event calendar or
upcoming events page. Do NOT rely only on what came up in Step 1 searches.

Search: "[venue name] ${city} events calendar" or "[venue name] upcoming events"

Look at what's actually on the calendar for the next 90 days.

## Step 3 — Extract ALL participatory events
From each venue's calendar, extract every event where participants can get on stage:

INCLUDE:
- Open mics (music, comedy, spoken word, poetry)
- Karaoke nights (e.g. "Karaoke Mondays")
- Jam sessions (jazz, blues, rock, etc.)
- Singer-songwriter showcases and rounds
- Comedy open mics and open stages
- Improv open mics and open stages
- Poetry slams
- Workshops where attendees perform or create
- Open studios
- Any weekly/monthly participatory recurring event

DO NOT include: concerts where audience only watches, ticketed headline shows,
DJ-only nights, trivia nights, sports screenings, happy hours.

## Rules
- startsAt must be >= ${today} and < ${maxDate}
- For recurring events: set startsAt to the NEXT specific occurrence on or after ${today}
- venue.city must be "${city}" — no suburbs or neighboring cities
- If you cannot determine a specific future date with confidence, OMIT the event
- Include the venue's Instagram handle if you find it on their site

Return ONLY a valid JSON array. No markdown, no explanation, no code fences:

[
  {
    "title": "event name",
    "description": "1–2 sentences — omit if unavailable",
    "startsAt": "${today}T20:00:00-05:00",
    "endsAt": "ISO-8601 optional",
    "type": "OPEN_MIC | JAM_SESSION | COMEDY_NIGHT | POETRY_SLAM | OPEN_STAGE | WORKSHOP | OPEN_STUDIO",
    "genres": ["Jazz, Stand-up, etc. — empty array if unknown"],
    "coverCharge": "Free or $5 etc. — omit if unknown",
    "slotDuration": "5 min, 3 songs — omit if unknown",
    "backline": ["equipment provided — empty array if unknown"],
    "signUpMethod": "DOOR | ONLINE | APP",
    "isRecurring": true,
    "recurringDescription": "Every Monday — omit if one-off",
    "venue": {
      "name": "venue name",
      "address": "full street address",
      "neighborhood": "neighborhood — omit if unknown",
      "city": "${city}",
      "state": "${state}",
      "instagramHandle": "@handle — omit if not found"
    }
  }
]
`.trim();
}

// ─── Parse + validate events ──────────────────────────────────────────────────

function parseEvents(raw: string, city: string, venueName: string): ScrapedEvent[] {
  const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  const now = Date.now();
  const maxMs = now + 90 * 24 * 60 * 60 * 1000;
  const valid: ScrapedEvent[] = [];

  for (const item of parsed) {
    const result = ScrapedEventSchema.safeParse(item);
    if (!result.success) {
      console.warn(`    [skip] Schema invalid at ${venueName}:`, result.error.flatten().fieldErrors);
      continue;
    }

    const event = result.data;
    const startsMs = new Date(event.startsAt).getTime();

    if (startsMs < now) {
      console.warn(`    [skip] Past: "${event.title}"`);
      continue;
    }
    if (startsMs > maxMs) {
      console.warn(`    [skip] Too far out: "${event.title}"`);
      continue;
    }
    if (event.venue.city.toLowerCase() !== city.toLowerCase()) {
      console.warn(`    [skip] Wrong city: "${event.title}" (${event.venue.city})`);
      continue;
    }

    valid.push(event);
  }

  return valid;
}

// ─── Public ───────────────────────────────────────────────────────────────────

export async function scrapeEventsForCity(target: CityTarget): Promise<ScrapedEvent[]> {
  const { city, state } = target;
  console.log(`  Searching venues + calendars in ${city}...`);
  const raw = await askClaude(buildPrompt(city, state));
  const events = parseEvents(raw, city, city);
  console.log(`  Found ${events.length} valid events`);
  return events;
}

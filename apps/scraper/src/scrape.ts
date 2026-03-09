import Anthropic from '@anthropic-ai/sdk';
import type { WebSearchTool20250305 } from '@anthropic-ai/sdk/resources/messages/messages';
import { z } from 'zod';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Zod schema — mirrors CreateEventInput from @on-deck/shared exactly ───────

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
  venue: z.object({
    name: z.string(),
    address: z.string(),
    neighborhood: z.string().optional(),
    city: z.string(),
    state: z.string(),
  }),
});

export type ScrapedEvent = z.infer<typeof ScrapedEventSchema>;

// ─── Prompt ───────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0];
const SIX_MONTHS_AGO = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split('T')[0];

const SEARCH_PROMPT = `
You are a research assistant helping populate a database of open mic and live music jam events in New York City.

Today's date is ${TODAY}.

Your task:
1. Search for open mic events, jam sessions, comedy open mics, poetry slams, and similar participatory performance events happening in New York City.
2. Search multiple sources — ESPECIALLY Meetup.com (meetup.com/find/?keywords=open+mic&location=New+York) and Reddit (r/nyc, r/newyorkcity, r/nycmusic). Also check venue websites and NYC event listings like TimeOut NY.
3. Only include results from pages published or updated after ${SIX_MONTHS_AGO} (within the last 6 months). Ignore any older listings.
4. For each result, carefully reason: Is this a real, active, participatory open mic or jam session where performers can sign up? Skip: articles about open mics, pure venue directories without event dates, events that already happened and are not recurring, and anything vague or unverifiable.
5. Prioritize recurring weekly/monthly events. For recurring events, set startsAt to the next upcoming occurrence from today (${TODAY}).

Return ONLY a JSON array. No markdown, no explanation, no code fences. Each element must match this exact shape — field names and types must match precisely:

[
  {
    "title": "string — event name",
    "description": "string — optional, omit if unavailable",
    "startsAt": "string — ISO-8601 datetime, e.g. 2026-03-11T19:00:00-05:00",
    "endsAt": "string — ISO-8601 datetime, optional",
    "type": "OPEN_MIC | JAM_SESSION | COMEDY_NIGHT | POETRY_SLAM | OPEN_STAGE | WORKSHOP | OPEN_STUDIO",
    "genres": ["string array, e.g. Jazz, Blues, Stand-up — empty array if unknown"],
    "coverCharge": "string — e.g. Free, $5, $10 at door — omit if unknown",
    "slotDuration": "string — e.g. 5 min, 3 songs — omit if unknown",
    "backline": ["string array — equipment provided, e.g. Drum kit — empty array if unknown"],
    "signUpMethod": "DOOR | ONLINE | APP",
    "isRecurring": true,
    "recurringDescription": "string — e.g. Every Tuesday — omit if not recurring",
    "venue": {
      "name": "string — venue name",
      "address": "string — full street address including NYC",
      "neighborhood": "string — NYC neighborhood, optional",
      "city": "New York",
      "state": "NY"
    }
  }
]
`.trim();

// ─── Phase 1: Search ──────────────────────────────────────────────────────────

const WEB_SEARCH_TOOL: WebSearchTool20250305 = {
  type: 'web_search_20250305',
  name: 'web_search',
  user_location: {
    type: 'approximate',
    city: 'New York',
    region: 'New York',
    country: 'US',
  },
};

async function searchWithClaude(): Promise<string> {
  console.log('  Searching the web via Claude...');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    tools: [WEB_SEARCH_TOOL],
    messages: [{ role: 'user', content: SEARCH_PROMPT }],
  });

  const textBlocks = response.content.filter((b) => b.type === 'text');
  if (textBlocks.length === 0) {
    throw new Error('Claude returned no text content after searching');
  }

  return textBlocks.map((b) => (b as { type: 'text'; text: string }).text).join('\n');
}

// ─── Phase 2: Parse + validate ────────────────────────────────────────────────

function parseEvents(raw: string): ScrapedEvent[] {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```$/m, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Could not find a JSON array in Claude response');
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Expected a JSON array from Claude');
  }

  const valid: ScrapedEvent[] = [];
  for (const item of parsed) {
    const result = ScrapedEventSchema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      console.warn('  Skipping invalid event:', result.error.flatten().fieldErrors);
    }
  }

  return valid;
}

// ─── Public ───────────────────────────────────────────────────────────────────

export async function scrapeNYCEvents(): Promise<ScrapedEvent[]> {
  const raw = await searchWithClaude();
  const events = parseEvents(raw);
  console.log(`  Found ${events.length} valid events after parsing`);
  return events;
}

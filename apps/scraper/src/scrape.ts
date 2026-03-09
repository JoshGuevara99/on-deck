import Anthropic from '@anthropic-ai/sdk';
import type { WebSearchTool20250305 } from '@anthropic-ai/sdk/resources/messages/messages';
import { z } from 'zod';
import type { CityTarget } from './cities';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Zod schema ───────────────────────────────────────────────────────────────

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

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function maxDateStr(): string {
  return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(city: string, state: string): string {
  const today = todayStr();
  const maxDate = maxDateStr();

  return `
You are a research assistant helping populate a database of open mic and participatory performance events.

Target city: ${city}, ${state}
Today's date: ${today}
Only return events starting: on or after ${today} AND before ${maxDate} (90 days from now)

Search strategy — use ALL of the following:
1. Meetup.com: search for "open mic" and "jam session" events in ${city}
2. Eventbrite: search for open mic, jam session, and comedy open mic events in ${city}
3. Reddit: search the local ${city} subreddit and music/comedy subreddits for open mic recommendations
4. Web search: "${city} open mic night ${today.slice(0, 7)}", "${city} jam session weekly", "${city} comedy open mic"
5. Venue websites and local event calendars specific to ${city}

STRICT RULES — violating these means the event will be discarded:
- startsAt MUST be on or after ${today} and before ${maxDate}
- For recurring events: calculate the next specific occurrence on or after ${today} — do NOT use a past date
- If you cannot determine a confident specific future date, OMIT the event
- venue.city MUST be "${city}" exactly — do not include events in neighboring cities or suburbs
- Only include events where performers can actively participate (sign up to perform, join a jam, etc.)

SKIP these entirely:
- Events that have already passed and are not recurring
- Articles, listicles, or "best open mics in ${city}" roundups without specific dates
- Venue pages that list open mics without confirmed current dates
- Events that stopped running (no evidence they are still active)
- Open mics more than 90 days away (too uncertain for recurring events)

Quality over quantity. Return 5–10 high-confidence results rather than 15 uncertain ones.
A verified recurring weekly event is more valuable than 3 guessed one-off events.

Return ONLY a JSON array. No markdown, no explanation, no code fences. Each element:

[
  {
    "title": "string — event name",
    "description": "string — 1–2 sentences, omit if unavailable",
    "startsAt": "ISO-8601 with timezone offset — e.g. ${today}T19:00:00-05:00",
    "endsAt": "ISO-8601 with timezone offset, optional",
    "type": "OPEN_MIC | JAM_SESSION | COMEDY_NIGHT | POETRY_SLAM | OPEN_STAGE | WORKSHOP | OPEN_STUDIO",
    "genres": ["e.g. Jazz, Blues, Stand-up — empty array if unknown"],
    "coverCharge": "e.g. Free, $5, $10 at door — omit if unknown",
    "slotDuration": "e.g. 5 min, 3 songs — omit if unknown",
    "backline": ["equipment provided — empty array if unknown"],
    "signUpMethod": "DOOR | ONLINE | APP",
    "isRecurring": true,
    "recurringDescription": "e.g. Every Tuesday — omit if not recurring",
    "venue": {
      "name": "string — venue name",
      "address": "string — full street address",
      "neighborhood": "string — neighborhood name, optional",
      "city": "${city}",
      "state": "${state}"
    }
  }
]
`.trim();
}

// ─── Web search ───────────────────────────────────────────────────────────────

const WEB_SEARCH_TOOL: WebSearchTool20250305 = {
  type: 'web_search_20250305',
  name: 'web_search',
};

async function searchWithClaude(city: string, state: string): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    tools: [WEB_SEARCH_TOOL],
    messages: [{ role: 'user', content: buildPrompt(city, state) }],
  });

  const textBlocks = response.content.filter((b) => b.type === 'text');
  if (textBlocks.length === 0) {
    throw new Error('Claude returned no text content after searching');
  }

  return textBlocks.map((b) => (b as { type: 'text'; text: string }).text).join('\n');
}

// ─── Parse + validate ─────────────────────────────────────────────────────────

function parseEvents(raw: string, city: string): ScrapedEvent[] {
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

  const now = Date.now();
  const maxMs = now + 90 * 24 * 60 * 60 * 1000;

  const valid: ScrapedEvent[] = [];
  for (const item of parsed) {
    const result = ScrapedEventSchema.safeParse(item);
    if (!result.success) {
      console.warn(`  [skip] Schema validation failed:`, result.error.flatten().fieldErrors);
      continue;
    }

    const event = result.data;
    const startsMs = new Date(event.startsAt).getTime();

    // Reject past events
    if (startsMs < now) {
      console.warn(`  [skip] Past event: "${event.title}" (${event.startsAt})`);
      continue;
    }

    // Reject events too far in the future
    if (startsMs > maxMs) {
      console.warn(`  [skip] Too far out: "${event.title}" (${event.startsAt})`);
      continue;
    }

    // Reject wrong city (Claude sometimes drifts to suburbs)
    if (event.venue.city.toLowerCase() !== city.toLowerCase()) {
      console.warn(`  [skip] Wrong city: "${event.title}" is in ${event.venue.city}, not ${city}`);
      continue;
    }

    valid.push(event);
  }

  return valid;
}

// ─── Public ───────────────────────────────────────────────────────────────────

export async function scrapeEventsForCity(target: CityTarget): Promise<ScrapedEvent[]> {
  console.log(`  Searching the web for ${target.city}, ${target.state}...`);
  const raw = await searchWithClaude(target.city, target.state);
  const events = parseEvents(raw, target.city);
  console.log(`  Found ${events.length} valid events after parsing`);
  return events;
}

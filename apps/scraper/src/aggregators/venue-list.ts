/**
 * Venue-list aggregator — tiered scraping pipeline
 *
 * Escalation order (cheapest → most expensive, stops at first success):
 *
 *   Tier 0  ICAL            — iCal / RSS feed discovery           (free)
 *   Tier 1  STATIC_HTML     — HTTP fetch + JSON-LD / CSS selectors (free)
 *   Tier 2  PLAYWRIGHT_HTML — Browser render + JSON-LD / CSS      (free, slower)
 *   Tier 3  LLM_TEXT        — Cleaned HTML → Gemini Flash          (~free)
 *   Tier 4  VISION          — Screenshot → Vision model            (~$0.01–0.02)
 *
 * Per-venue state (VenueScrapeState) is persisted after each run so that:
 *   - Future runs skip straight to the last known working tier
 *   - Runs are skipped entirely when the page content hasn't changed (hash match)
 */

import { createHash } from 'node:crypto';
import * as ical from 'node-ical';
import * as cheerio from 'cheerio';
import { ScrapeStrategy } from '@prisma/client';
import { chromium, type Browser, type Page } from 'playwright';
import type { ScrapedEvent } from '../scrape';
import type { VenueTarget } from '../venues/index';
import { prisma } from '../ingest';
import { toScrapedEvent, isFuture, isWithinLookahead, isMidnight, floatingToUTC, extractTimeFromText, mergeDateAndTime, DEFAULT_TIMEZONE } from '../extract-utils';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of venues scraped in parallel. */
const CONCURRENCY = 3;

const PAGE_TIMEOUT_MS = 30_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TierResult {
  events: ScrapedEvent[];
  tier: ScrapeStrategy;
  /**
   * Extraction confidence 1–5.
   * Deterministic tiers (ICAL, STATIC_HTML, PLAYWRIGHT_HTML) always return 5.
   * LLM tiers (LLM_TEXT, VISION) self-report per-event; this is the minimum
   * across all events in the result (or 5 if no events were found).
   */
  confidence: number;
}

/**
 * Mutable context threaded through all tiers for a single venue.
 * Each tier populates whichever fields it fetches so downstream tiers
 * can reuse them without re-fetching.
 */
export interface ScrapeContext {
  venue: VenueTarget;
  /** Raw HTML from a plain HTTP fetch. Populated by STATIC_HTML. */
  rawHtml: string | null;
  /** Fully rendered HTML after JS execution. Populated by PLAYWRIGHT_HTML. */
  renderedHtml: string | null;
  /**
   * Visible text derived from renderedHtml (nav/footer/scripts stripped).
   * Populated by PLAYWRIGHT_HTML for use by LLM_TEXT.
   */
  pageText: string | null;
  /** Viewport screenshot as a PNG buffer. Populated by VISION. */
  screenshot: Buffer | null;
}

type TierFn = (ctx: ScrapeContext, page: Page | null) => Promise<TierResult>;

interface TierDef {
  strategy: ScrapeStrategy;
  fn: TierFn;
  /** If true, this tier requires a live Playwright page. */
  needsBrowser: boolean;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Short SHA-256 hash of page content — used to detect unchanged pages. */
function contentHash(html: string): string {
  return createHash('sha256').update(html).digest('hex').slice(0, 16);
}

/**
 * Runs `fn` over `items` with at most `limit` concurrent executions.
 * Order is not guaranteed.
 */
async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

// ─── State management ─────────────────────────────────────────────────────────

async function loadScrapeState(url: string) {
  return prisma.venueScrapeState.findUnique({ where: { url } });
}

async function saveScrapeState(
  venue: VenueTarget,
  result: TierResult | null,
  ctx: ScrapeContext,
): Promise<void> {
  const content = ctx.renderedHtml ?? ctx.rawHtml;
  const hash = content ? contentHash(content) : null;

  const shared = {
    venueName: venue.name,
    lastScrapedAt: new Date(),
    successfulTier: result?.tier ?? null,
    htmlHash: hash,
    lastError: result ? null : 'No events found across all tiers',
  };

  await prisma.venueScrapeState.upsert({
    where: { url: venue.url },
    create: {
      url: venue.url,
      ...shared,
      consecutiveFailures: result ? 0 : 1,
    },
    update: {
      ...shared,
      consecutiveFailures: result ? 0 : { increment: 1 },
    },
  });
}

// ─── Tier stubs ───────────────────────────────────────────────────────────────
// Each tier returns an empty result until implemented.
// The context (ctx) should be populated as a side-effect even when no events
// are found, so downstream tiers can reuse fetched content.

// ─── Tier 0: iCal / RSS ───────────────────────────────────────────────────────

/** Common .ics paths to probe relative to the venue's base URL. */
const ICAL_PROBE_PATHS = [
  '/events.ics',
  '/calendar.ics',
  '/calendar/events.ics',
  '/feed/events.ics',
  '/events/feed.ics',
  '/wp-admin/admin-ajax.php?action=mec_ical_download', // Modern Events Calendar (WP plugin)
];

const FETCH_TIMEOUT_MS = 10_000;

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OnDeckBot/1.0)' },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Discovers .ics feed URLs for a venue:
 *   1. Fetches the venue page HTML (stored in ctx.rawHtml for Tier 1 to reuse)
 *   2. Parses <link rel="alternate" type="text/calendar">
 *   3. Detects Google Calendar iframes and converts to iCal URLs
 *   4. Tries Squarespace's ?format=ical export on the venue URL
 *   5. Probes common .ics subpaths relative to the base URL
 */
/**
 * If the venue URL itself is a Google Calendar embed link, convert it directly
 * to an iCal feed URL — no page fetch needed.
 * e.g. https://calendar.google.com/calendar/embed?src=CALENDAR_ID&...
 *   → https://calendar.google.com/calendar/ical/CALENDAR_ID/public/basic.ics
 */
function extractGoogleCalendarIcalUrl(url: string): string | null {
  // Match ?src= (first param) or &src= (subsequent param)
  const match = url.match(/calendar\.google\.com\/calendar\/(?:u\/\d+\/)?embed\?(?:[^&]*&)*src=([^&]+)/);
  if (!match?.[1]) return null;
  const calId = decodeURIComponent(match[1]);
  return `https://calendar.google.com/calendar/ical/${calId}/public/basic.ics`;
}

async function discoverIcalUrls(ctx: ScrapeContext): Promise<string[]> {
  const base = new URL(ctx.venue.url);
  const candidates: string[] = [];

  // If the venue URL is itself a Google Calendar embed, convert directly
  const directGcal = extractGoogleCalendarIcalUrl(ctx.venue.url);
  if (directGcal) {
    candidates.push(directGcal);
    return candidates; // no page fetch needed
  }

  // Fetch the venue page (store in ctx for Tier 1 to reuse)
  const html = await fetchText(ctx.venue.url);
  if (html) {
    ctx.rawHtml = html;
    const $ = cheerio.load(html);

    // <link rel="alternate" type="text/calendar" href="...">
    $('link[rel="alternate"]').each((_, el) => {
      const type = $(el).attr('type') ?? '';
      const href = $(el).attr('href') ?? '';
      if (type.includes('calendar') && href) {
        try { candidates.push(new URL(href, base).toString()); } catch { /* skip */ }
      }
    });

    // Google Calendar embed iframes:
    // src="https://calendar.google.com/calendar/embed?src=CALENDAR_ID&..."
    // → convert to: https://calendar.google.com/calendar/ical/CALENDAR_ID/public/basic.ics
    $('iframe').each((_, el) => {
      const src = $(el).attr('src') ?? '';
      const match = src.match(/calendar\.google\.com\/calendar\/embed\?(?:[^&]*&)*src=([^&]+)/);
      if (match?.[1]) {
        const calId = decodeURIComponent(match[1]);
        candidates.push(`https://calendar.google.com/calendar/ical/${calId}/public/basic.ics`);
      }
    });
  }

  // Squarespace exports iCal via ?format=ical on the events page URL
  try {
    const squarespaceIcal = new URL(ctx.venue.url);
    squarespaceIcal.searchParams.set('format', 'ical');
    candidates.push(squarespaceIcal.toString());
  } catch { /* skip */ }

  // Probe common .ics paths
  for (const path of ICAL_PROBE_PATHS) {
    candidates.push(new URL(path, base).toString());
  }

  return [...new Set(candidates)];
}

/** Extracts a plain string from a node-ical ParameterValue (string | { val, params }). */
function icalStr(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'val' in value) return String((value as any).val);
  return '';
}

/**
 * Returns true if a node-ical Date was a "floating" datetime (no TZID, no Z).
 * Floating datetimes are parsed as if in the server's local timezone (UTC on
 * most CI/production hosts), so we must re-interpret them in the venue's timezone.
 */
function isFloatingDatetime(d: Date): boolean {
  const tz = (d as any).tz as string | undefined;
  return !tz || tz === '';
}

/**
 * Normalises a Date returned by node-ical for a given venue timezone.
 *  - Floating datetimes (no TZ info)  → convert from naive-UTC to venue local
 *  - UTC / named-TZ datetimes         → already correct, return as-is
 */
function normaliseIcalDate(d: Date, tz: string): Date {
  return isFloatingDatetime(d) ? floatingToUTC(d, tz) : d;
}

/** Parses a fetched .ics string and maps valid entries to ScrapedEvent[]. */
function parseIcalFeed(icsText: string, venue: VenueTarget): ScrapedEvent[] {
  let parsed: ical.CalendarResponse;
  try {
    parsed = ical.sync.parseICS(icsText);
  } catch {
    return [];
  }

  const tz = venue.timezone ?? DEFAULT_TIMEZONE;
  const now = new Date();
  const maxDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const events: ScrapedEvent[] = [];

  for (const component of Object.values(parsed)) {
    if (!component || component.type !== 'VEVENT') continue;
    const vevent = component as ical.VEvent;

    // Skip all-day events — they have no meaningful time to display
    if ((vevent as any).datetype === 'date') continue;

    const title = icalStr(vevent.summary);
    const description = icalStr(vevent.description) || undefined;
    const address = icalStr(vevent.location) || undefined;

    if (vevent.rrule) {
      // Recurring event — store only the next upcoming occurrence.
      // .after() is not implemented in node-ical's rrule wrapper — use between() and take the first result
      const next: Date | undefined = vevent.rrule.between(now, maxDate, true)[0];
      if (!next || !isWithinLookahead(next)) continue;

      // Recurring rule dates are always in UTC (rrule library handles TZ internally),
      // but the original DTSTART time component may be floating — re-apply if needed.
      const normalisedNext = isFloatingDatetime(vevent.start as Date)
        ? (() => {
            // Re-apply the floating→TZ correction to the expanded occurrence date.
            // next preserves the wall-clock time from DTSTART but in UTC (i.e. treating
            // it as UTC already). Apply the same tz offset correction we do for singles.
            return floatingToUTC(next, tz);
          })()
        : next;

      if (isMidnight(normalisedNext) && isFloatingDatetime(vevent.start as Date)) {
        console.warn(`  [${venue.name}] Skipping "${title}" — midnight floating time (likely date-only feed entry)`);
        continue;
      }

      // Compute duration from the original start/end so recurring occurrences get the right end time
      const durationMs =
        vevent.end instanceof Date && vevent.start instanceof Date
          ? vevent.end.getTime() - vevent.start.getTime()
          : 0;

      const endsAt = durationMs > 0
        ? new Date(normalisedNext.getTime() + durationMs).toISOString()
        : undefined;
      const recurringDescription = (() => {
        try { return (vevent.rrule as any).toText?.() ?? undefined; } catch { return undefined; }
      })();

      const event = toScrapedEvent(
        { title, description, startsAt: normalisedNext.toISOString(), endsAt, address, isRecurring: true, recurringDescription },
        venue,
      );
      if (event) events.push(event);
    } else {
      // Single occurrence
      const rawStart = vevent.start instanceof Date ? vevent.start : new Date(String(vevent.start));
      const startsAt = normaliseIcalDate(rawStart, tz);

      if (!isFuture(startsAt) || !isWithinLookahead(startsAt)) continue;

      // Skip midnight floating entries — almost certainly a date-only value
      if (isMidnight(startsAt) && isFloatingDatetime(rawStart)) {
        console.warn(`  [${venue.name}] Skipping "${title}" — midnight floating time (likely date-only feed entry)`);
        continue;
      }

      const rawEnd = vevent.end instanceof Date ? vevent.end : undefined;
      const endsAt = rawEnd ? normaliseIcalDate(rawEnd, tz).toISOString() : undefined;

      const event = toScrapedEvent(
        { title, description, startsAt: startsAt.toISOString(), endsAt, address },
        venue,
      );
      if (event) events.push(event);
    }
  }

  return events;
}

async function tierIcal(ctx: ScrapeContext, _page: Page | null): Promise<TierResult> {
  const candidates = await discoverIcalUrls(ctx);

  // Probe all candidates in parallel — each is an independent HTTP request
  const results = await Promise.all(
    candidates.map(async (url) => {
      const text = await fetchText(url);
      if (!text?.includes('BEGIN:VCALENDAR')) return [];
      return parseIcalFeed(text, ctx.venue);
    }),
  );

  // Return the first candidate that yielded events
  for (const events of results) {
    if (events.length > 0) {
      return { events, tier: ScrapeStrategy.ICAL, confidence: 5 };
    }
  }

  return { events: [], tier: ScrapeStrategy.ICAL, confidence: 5 };
}

// ─── Tier 1: Static HTML ──────────────────────────────────────────────────────

/** Extract events from JSON-LD <script type="application/ld+json"> tags. */
function extractJsonLd(html: string, venue: VenueTarget): ScrapedEvent[] {
  const $ = cheerio.load(html);
  const tz = venue.timezone ?? DEFAULT_TIMEZONE;
  const events: ScrapedEvent[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    let parsed: unknown;
    try { parsed = JSON.parse($(el).html() ?? ''); } catch { return; }

    const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, any>;
      if (obj['@type'] !== 'Event' || !obj.name || !obj.startDate) continue;

      // Use the event name + description as context for time extraction when
      // startDate is date-only (e.g. "WEDNESDAY 5:30PM OPEN MIC" → extracts 5:30pm)
      const contextText = `${obj.name} ${obj.description ?? ''}`;
      const startsAt = resolveDateTime(String(obj.startDate), contextText, tz);
      if (!startsAt) continue; // date-only with no time found — skip rather than store midnight

      const endsAt = obj.endDate
        ? resolveDateTime(String(obj.endDate), contextText, tz) ?? undefined
        : undefined;

      let address: string | undefined;
      if (obj.location?.address) {
        address = typeof obj.location.address === 'string'
          ? obj.location.address
          : obj.location.address?.streetAddress;
      }

      const event = toScrapedEvent({
        title: obj.name,
        description: obj.description,
        startsAt,
        endsAt,
        address,
        venueName: obj.location?.name,
      }, venue);

      if (event) events.push(event);
    }
  });

  return events;
}

/**
 * Returns true if a datetime attribute value is date-only (no time component).
 * e.g. "2026-03-22" → true,  "2026-03-22T17:30:00" → false
 */
function isDateOnly(datetime: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(datetime.trim());
}

/**
 * Attempts to resolve a full datetime from a potentially date-only `datetime`
 * attribute by searching the container text for a time string.
 * Falls back to the original value if no time is found.
 * Applies the venue's timezone when the resulting datetime has no TZ offset.
 */
function resolveDateTime(datetime: string, containerText: string, tz: string): string | null {
  if (!isDateOnly(datetime)) {
    // Has a time component — apply TZ correction if no offset present
    if (!/[Z+\-]\d{2}:?\d{2}$/.test(datetime) && !datetime.endsWith('Z')) {
      // Floating datetime string (e.g. "2026-03-22T17:30:00" no TZ suffix)
      const d = new Date(datetime + 'Z'); // parse naively as UTC
      if (isNaN(d.getTime())) return null;
      return floatingToUTC(d, tz).toISOString();
    }
    return datetime; // already timezone-aware
  }

  // Date-only — try to find a time string nearby
  const timeStr = extractTimeFromText(containerText);
  if (timeStr) {
    const merged = mergeDateAndTime(datetime, timeStr, tz);
    return merged?.toISOString() ?? null;
  }

  // No time found — skip rather than storing a misleading midnight value
  return null;
}

/** Extract events using CSS selectors for known CMS platforms. */
function extractBySelectors(html: string, venue: VenueTarget): ScrapedEvent[] {
  const $ = cheerio.load(html);
  const tz = venue.timezone ?? DEFAULT_TIMEZONE;
  const events: ScrapedEvent[] = [];

  const tryAdd = (title: string, rawDatetime: string, containerText: string, description?: string) => {
    if (!title || !rawDatetime) return;
    const datetime = resolveDateTime(rawDatetime, containerText, tz);
    if (!datetime) return;
    const event = toScrapedEvent({ title, description, startsAt: datetime }, venue);
    if (event) events.push(event);
  };

  // ── Squarespace ──────────────────────────────────────────────────────────────
  $('.eventlist-event').each((_, el) => {
    const title    = $(el).find('.eventlist-title').text().trim();
    const datetime = $(el).find('time[datetime]').attr('datetime') ?? '';
    const desc     = $(el).find('.eventlist-description').text().trim();
    tryAdd(title, datetime, $(el).text(), desc);
  });
  if (events.length) return events;

  // ── WordPress: The Events Calendar plugin ────────────────────────────────────
  $('.tribe-event, .type-tribe_events').each((_, el) => {
    const title    = $(el).find('h2, h3, .tribe-event-url').first().text().trim();
    const datetime = $(el).find('time[datetime]').first().attr('datetime')
      ?? $(el).find('abbr[title]').first().attr('title') ?? '';
    const desc     = $(el).find('.tribe-event-description, .tribe-events-schedule').text().trim();
    tryAdd(title, datetime, $(el).text(), desc);
  });
  if (events.length) return events;

  // ── Generic: any container with a <time datetime="..."> ──────────────────────
  $('time[datetime], [datetime]').each((_, el) => {
    const datetime  = $(el).attr('datetime') ?? '';
    const container = $(el).closest('article, li, div[class*="event" i], div[class*="Event"]');
    if (!container.length) return;
    const title = container.find('h1,h2,h3,h4,a').first().text().trim();
    const desc  = container.find('p').first().text().trim();
    tryAdd(title, datetime, container.text(), desc);
  });

  return events;
}

async function tierStaticHtml(ctx: ScrapeContext, _page: Page | null): Promise<TierResult> {
  // Reuse HTML already fetched by Tier 0, or fetch it now
  if (!ctx.rawHtml) {
    ctx.rawHtml = await fetchText(ctx.venue.url);
  }
  if (!ctx.rawHtml) return { events: [], tier: ScrapeStrategy.STATIC_HTML, confidence: 5 };

  // Strategy A: JSON-LD (clean, structured)
  const jsonLdEvents = extractJsonLd(ctx.rawHtml, ctx.venue);
  if (jsonLdEvents.length) return { events: jsonLdEvents, tier: ScrapeStrategy.STATIC_HTML, confidence: 5 };

  // Strategy B: CSS selectors for known platforms
  const selectorEvents = extractBySelectors(ctx.rawHtml, ctx.venue);
  if (selectorEvents.length) return { events: selectorEvents, tier: ScrapeStrategy.STATIC_HTML, confidence: 5 };

  return { events: [], tier: ScrapeStrategy.STATIC_HTML, confidence: 5 };
}

async function tierPlaywrightHtml(ctx: ScrapeContext, page: Page | null): Promise<TierResult> {
  if (!page) return { events: [], tier: ScrapeStrategy.PLAYWRIGHT_HTML, confidence: 5 };

  // Extract fully rendered HTML (post-JS execution) and store for state hashing
  ctx.renderedHtml = await page.content();

  // Extract visible page text: strip noise elements then read innerText.
  // innerText respects CSS visibility and inserts newlines at block boundaries,
  // giving Tier 3 (LLM) clean, human-readable text without nav/footer clutter.
  ctx.pageText = await page.evaluate(() => {
    document.querySelectorAll('nav, footer, header, script, style, noscript, [aria-hidden="true"]')
      .forEach((el) => el.remove());
    return document.body?.innerText ?? '';
  });

  // Re-run the same extraction logic as Tier 1 on the now-rendered DOM.
  // This catches SPAs that serve an empty shell to plain fetch().
  const jsonLdEvents = extractJsonLd(ctx.renderedHtml, ctx.venue);
  if (jsonLdEvents.length) return { events: jsonLdEvents, tier: ScrapeStrategy.PLAYWRIGHT_HTML, confidence: 5 };

  const selectorEvents = extractBySelectors(ctx.renderedHtml, ctx.venue);
  if (selectorEvents.length) return { events: selectorEvents, tier: ScrapeStrategy.PLAYWRIGHT_HTML, confidence: 5 };

  return { events: [], tier: ScrapeStrategy.PLAYWRIGHT_HTML, confidence: 5 };
}

async function tierLlmText(ctx: ScrapeContext, _page: Page | null): Promise<TierResult> {
  // TODO:
  //   1. Require ctx.pageText (populated by PLAYWRIGHT_HTML) — skip if missing
  //   2. Run isParticipatory() on pageText first — skip LLM call if no signal words
  //   3. Truncate to ~4k tokens
  //   4. Call Gemini Flash with strict JSON schema prompt
  //   5. Parse + validate response via Zod ScrapedEventSchema
  //   6. Each event should include a confidence score (1–5)
  return { events: [], tier: ScrapeStrategy.LLM_TEXT, confidence: 5 };
}

async function tierVision(ctx: ScrapeContext, page: Page | null): Promise<TierResult> {
  // TODO:
  //   1. Take a viewport screenshot via page.screenshot() → store in ctx.screenshot
  //   2. If a calendar/event container is detectable, crop to it (reduces cost)
  //   3. Send image to a vision-capable model (Claude Sonnet recommended)
  //   4. Same structured JSON schema as LLM_TEXT
  //   5. Gate carefully: only reached when all text-based tiers returned nothing
  return { events: [], tier: ScrapeStrategy.VISION, confidence: 5 };
}

// ─── Tier registration ────────────────────────────────────────────────────────

const TIERS: TierDef[] = [
  { strategy: ScrapeStrategy.ICAL,            fn: tierIcal,           needsBrowser: false },
  { strategy: ScrapeStrategy.STATIC_HTML,     fn: tierStaticHtml,     needsBrowser: false },
  { strategy: ScrapeStrategy.PLAYWRIGHT_HTML, fn: tierPlaywrightHtml, needsBrowser: true  },
  // Tier 3 (LLM_TEXT) and Tier 4 (VISION) not yet implemented
];

// ─── Orchestrator ─────────────────────────────────────────────────────────────

async function scrapeVenueWithTiers(venue: VenueTarget, browser: Browser): Promise<TierResult> {
  const state = await loadScrapeState(venue.url);

  const ctx: ScrapeContext = {
    venue,
    rawHtml: null,
    renderedHtml: null,
    pageText: null,
    screenshot: null,
  };

  // If we have a known working tier and the page content hasn't changed
  // (hash match), skip straight to that tier to avoid re-running cheaper ones.
  // On first run or after a failure, always start from Tier 0.
  const startIndex = (() => {
    if (!state?.successfulTier || !state?.htmlHash) return 0;
    const idx = TIERS.findIndex((t) => t.strategy === state.successfulTier);
    return idx >= 0 ? idx : 0;
  })();

  let page: Page | null = null;

  try {
    for (let i = startIndex; i < TIERS.length; i++) {
      const { strategy, fn, needsBrowser } = TIERS[i]!;

      // Lazily open and navigate a browser page the first time a tier needs one.
      // Subsequent browser-needing tiers (e.g. VISION after PLAYWRIGHT_HTML)
      // reuse the same already-navigated page.
      if (needsBrowser && !page) {
        page = await browser.newPage();
        const ok = await page
          .goto(venue.url, { waitUntil: 'load', timeout: PAGE_TIMEOUT_MS })
          .then(() => true)
          .catch(() => false);

        if (!ok) {
          console.warn(`  [${venue.name}] Failed to load page — skipping browser tiers`);
          await page.close();
          page = null;
          // Skip all remaining browser-required tiers
          continue;
        }

        await page.waitForLoadState('networkidle').catch(() => {});
      }

      const result = await fn(ctx, page);

      if (result.events.length > 0) {
        const tagged = result.events.map((e) => ({ ...e, sourceUrl: venue.url }));
        console.log(`  [${venue.name}] ${tagged.length} events via ${strategy}`);
        const final: TierResult = { ...result, events: tagged };
        await saveScrapeState(venue, final, ctx);
        return final;
      }
    }
  } catch (err) {
    console.warn(`  [${venue.name}] Unexpected error:`, err);
  } finally {
    await page?.close();
  }

  console.log(`  [${venue.name}] No events found across all tiers`);
  await saveScrapeState(venue, null, ctx);
  return { events: [], tier: ScrapeStrategy.STATIC_HTML, confidence: 0 };
}

// ─── Public ───────────────────────────────────────────────────────────────────

export async function scrapeVenueList(venues: VenueTarget[]): Promise<ScrapedEvent[]> {
  const browser = await chromium.launch({
    args: ['--no-sandbox'],
  });

  const all: ScrapedEvent[] = [];

  try {
    await runWithConcurrency(venues, CONCURRENCY, async (venue) => {
      console.log(`  Scraping ${venue.name}...`);
      const result = await scrapeVenueWithTiers(venue, browser);
      all.push(...result.events);
    });
  } finally {
    await browser.close();
  }

  return all;
}

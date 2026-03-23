/**
 * Venue-list aggregator — tiered scraping pipeline
 *
 * Escalation order (cheapest → most expensive, stops at first success):
 *
 *   Tier 0  ICAL            — iCal / RSS feed discovery           (free)
 *   Tier 1  STATIC_HTML     — HTTP fetch + JSON-LD / CSS selectors (free)
 *   Tier 2  PLAYWRIGHT_HTML — Browser render + JSON-LD / CSS      (free, slower)
 *   Tier 3  VISION          — Screenshot → Gemini Flash Vision    (~$0.01–0.02, gated)
 *
 * Per-venue state (VenueScrapeState) is persisted after each run so that:
 *   - Future runs skip straight to the last known working tier
 *   - Tier 3 is never called more than once per venue per 7-day window
 *   - Venues that fail Tier 3 three consecutive weeks are suspended
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as ical from 'node-ical';
import * as cheerio from 'cheerio';
import { ScrapeStrategy } from '@prisma/client';
import { chromium, type Browser, type Page } from 'playwright';
import type { ScrapedEvent } from '../scrape';
import type { VenueTarget } from '../venues/index';
import { prisma } from '../ingest';
import { toScrapedEvent, isFuture, isWithinLookahead, isMidnight, floatingToUTC, extractTimeFromText, mergeDateAndTime, DEFAULT_TIMEZONE } from '../extract-utils';
import { callGeminiVision } from '../llm/gemini';

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

// ─── Tier 3: Vision (Gemini Flash) ───────────────────────────────────────────

const TIER3_COOLDOWN_MS   = 7 * 24 * 60 * 60 * 1000; // 7 days
const TIER3_SUSPEND_AFTER = 3;                         // consecutive weekly failures
const MAX_SCREENSHOT_BYTES = 1_000_000;                // 1 MB

const TIER3_SAVE_SCREENSHOTS = process.env.TIER3_SAVE_SCREENSHOTS === 'true';
const TIER3_GEMINI_ENABLED   = process.env.TIER3_GEMINI_ENABLED   === 'true';

const SCREENSHOTS_DIR = join(process.cwd(), 'apps/scraper/debug/screenshots');

/**
 * Returns the reason Tier 3 should be skipped, or null if it should run.
 * Checks suspension, 7-day cooldown, and whether a cached result is still fresh.
 */
function tier3SkipReason(state: Awaited<ReturnType<typeof loadScrapeState>>): string | null {
  if (!state) return null; // first run — proceed

  if (state.tier3Suspended) return 'suspended after repeated failures';

  const now = Date.now();

  // Fresh cache → use it (caller handles returning cached events)
  if (state.tier3CachedAt && now - state.tier3CachedAt.getTime() < TIER3_COOLDOWN_MS) {
    return 'cache_hit'; // special token — caller returns cache, doesn't skip
  }

  // Recent failed call within cooldown window → skip
  if (state.tier3LastCalledAt && now - state.tier3LastCalledAt.getTime() < TIER3_COOLDOWN_MS) {
    return 'called within 7-day cooldown window';
  }

  return null; // eligible for a live call
}

/** Slugifies a venue name for use as a filename. e.g. "Pete's Candy Store" → "petes_candy_store" */
function venueSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/**
 * Captures a screenshot of the events/calendar section of the page.
 *
 * Priority:
 *   1. venue.calendarSelector — manually specified via Chrome DevTools inspection
 *   2. Auto-detect by common keyword patterns in id/class/aria-label
 *   3. Full viewport fallback
 *
 * Uses Playwright's locator.screenshot() which scrolls the element into
 * view automatically — no manual coordinate math needed.
 */
async function captureEventScreenshot(page: Page, venue: VenueTarget): Promise<Buffer> {
  // ── 1. Manual selector (preferred) ───────────────────────────────────────────
  if (venue.calendarSelector) {
    const locator = page.locator(venue.calendarSelector).first();
    if (await locator.count() > 0) {
      return locator.screenshot({ type: 'png' });
    }
    console.warn(`  [${venue.name}] calendarSelector "${venue.calendarSelector}" not found — falling back`);
  }

  // ── 2. Auto-detect by keyword ─────────────────────────────────────────────────
  const autoSelector = [
    '[id*="event" i]', '[class*="event" i]',
    '[id*="calendar" i]', '[class*="calendar" i]',
    '[id*="schedule" i]', '[class*="schedule" i]',
    '[id*="upcoming" i]', '[class*="upcoming" i]',
    '[aria-label*="event" i]', '[aria-label*="calendar" i]',
  ].join(', ');

  const locator = page.locator(autoSelector).first();
  if (await locator.count() > 0) {
    const box = await locator.boundingBox();
    if (box && box.width >= 100 && box.height >= 100) {
      return locator.screenshot({ type: 'png' });
    }
  }

  // ── 3. Full viewport fallback ─────────────────────────────────────────────────
  return page.screenshot({ type: 'png', fullPage: false });
}

/** Saves a screenshot buffer to the debug folder, named by venue slug. */
function saveScreenshot(buf: Buffer, venueName: string): void {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  const filename = `${venueSlug(venueName)}.png`;
  const filepath = join(SCREENSHOTS_DIR, filename);
  writeFileSync(filepath, buf);
  console.log(`  [${venueName}] Screenshot saved → apps/scraper/debug/screenshots/${filename}`);
}

/** Compresses a PNG by re-screenshotting at reduced size if over the size limit. */
async function compressIfNeeded(buf: Buffer, page: Page): Promise<Buffer> {
  if (buf.byteLength <= MAX_SCREENSHOT_BYTES) return buf;
  return page.screenshot({ type: 'png', fullPage: false, scale: 'css' });
}

/** Persists a Tier 3 invocation to the usage log. */
async function logTier3(
  venue: VenueTarget,
  opts: { succeeded: boolean; eventCount: number; fromCache: boolean; error?: string },
) {
  await prisma.tier3Log.create({
    data: {
      url:        venue.url,
      venueName:  venue.name,
      succeeded:  opts.succeeded,
      eventCount: opts.eventCount,
      fromCache:  opts.fromCache,
      error:      opts.error ?? null,
    },
  });
}

/** Updates VenueScrapeState Tier 3 fields after a live call. */
async function saveTier3State(
  venue: VenueTarget,
  result: { success: boolean; events: ScrapedEvent[] },
) {
  const now = new Date();

  if (result.success) {
    await prisma.venueScrapeState.upsert({
      where:  { url: venue.url },
      create: {
        url:                     venue.url,
        venueName:               venue.name,
        tier3LastCalledAt:       now,
        tier3CachedAt:           now,
        tier3CachedEvents:       result.events as any,
        tier3ConsecutiveFailures: 0,
      },
      update: {
        tier3LastCalledAt:        now,
        tier3CachedAt:            now,
        tier3CachedEvents:        result.events as any,
        tier3ConsecutiveFailures: 0,
      },
    });
  } else {
    const current = await prisma.venueScrapeState.findUnique({ where: { url: venue.url } });
    const consecutive = (current?.tier3ConsecutiveFailures ?? 0) + 1;
    const suspended   = consecutive >= TIER3_SUSPEND_AFTER;

    if (suspended) {
      console.warn(`  [${venue.name}] Tier 3 suspended after ${consecutive} consecutive failures — flagged for manual review`);
    }

    await prisma.venueScrapeState.upsert({
      where:  { url: venue.url },
      create: {
        url:                      venue.url,
        venueName:                venue.name,
        tier3LastCalledAt:        now,
        tier3ConsecutiveFailures: consecutive,
        tier3Suspended:           suspended,
      },
      update: {
        tier3LastCalledAt:        now,
        tier3ConsecutiveFailures: consecutive,
        tier3Suspended:           suspended,
      },
    });
  }
}

async function tierVision(ctx: ScrapeContext, page: Page | null): Promise<TierResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn(`  [${ctx.venue.name}] Skipping Tier 3 — GEMINI_API_KEY not set`);
    return { events: [], tier: ScrapeStrategy.VISION, confidence: 0 };
  }

  const state = await loadScrapeState(ctx.venue.url);
  const skipReason = tier3SkipReason(state);

  // ── Cache hit ────────────────────────────────────────────────────────────────
  if (skipReason === 'cache_hit' && state?.tier3CachedEvents) {
    console.log(`  [${ctx.venue.name}] Tier 3 — returning cached result (< 7 days old)`);
    const cached = (state.tier3CachedEvents as ScrapedEvent[]).map((e) => ({ ...e, sourceUrl: ctx.venue.url }));
    await logTier3(ctx.venue, { succeeded: true, eventCount: cached.length, fromCache: true });
    return { events: cached, tier: ScrapeStrategy.VISION, confidence: 4 };
  }

  // ── Skip ────────────────────────────────────────────────────────────────────
  if (skipReason) {
    console.log(`  [${ctx.venue.name}] Skipping Tier 3 — ${skipReason}`);
    return { events: [], tier: ScrapeStrategy.VISION, confidence: 0 };
  }

  // ── Live call ────────────────────────────────────────────────────────────────
  if (!page) {
    console.warn(`  [${ctx.venue.name}] Skipping Tier 3 — no browser page available`);
    return { events: [], tier: ScrapeStrategy.VISION, confidence: 0 };
  }

  console.log(`  [${ctx.venue.name}] Tier 3 — calling Gemini Flash Vision (all free tiers returned 0 events)`);

  // ── Layer 1: Screenshot ──────────────────────────────────────────────────────
  // Wait for JS-heavy pages to finish rendering before screenshotting
  await page.waitForTimeout(1000);

  let screenshot: Buffer;
  try {
    const raw = await captureEventScreenshot(page, ctx.venue);
    screenshot = await compressIfNeeded(raw, page);
    ctx.screenshot = screenshot;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`  [${ctx.venue.name}] Tier 3 — screenshot failed: ${msg}`);
    await logTier3(ctx.venue, { succeeded: false, eventCount: 0, fromCache: false, error: msg });
    await saveTier3State(ctx.venue, { success: false, events: [] });
    return { events: [], tier: ScrapeStrategy.VISION, confidence: 0 };
  }

  if (TIER3_SAVE_SCREENSHOTS) saveScreenshot(screenshot, ctx.venue.name);

  // ── Layer 2: Gemini (toggle) ─────────────────────────────────────────────────
  if (!TIER3_GEMINI_ENABLED) {
    console.log(`  [${ctx.venue.name}] Tier 3 — Gemini disabled, screenshot captured for inspection`);
    return { events: [], tier: ScrapeStrategy.VISION, confidence: 0 };
  }

  const { events: rawEvents, fromRetry, error } = await callGeminiVision(screenshot, apiKey);

  if (fromRetry && rawEvents.length === 0) {
    console.warn(`  [${ctx.venue.name}] Tier 3 — Gemini returned no parseable events after retry`);
    await logTier3(ctx.venue, { succeeded: false, eventCount: 0, fromCache: false, error });
    await saveTier3State(ctx.venue, { success: false, events: [] });
    return { events: [], tier: ScrapeStrategy.VISION, confidence: 0 };
  }

  // Convert GeminiEvent → ScrapedEvent
  // Gemini returns date as YYYY-MM-DD and time as HH:MM (24h) or null.
  const tz = ctx.venue.timezone ?? DEFAULT_TIMEZONE;
  const scraped: ScrapedEvent[] = [];

  for (const ge of rawEvents) {
    let startsAt: Date | null = null;

    if (ge.time) {
      // HH:MM → convert to am/pm string that mergeDateAndTime understands
      const [hStr, mStr] = ge.time.split(':');
      const h = parseInt(hStr ?? '0', 10);
      const m = parseInt(mStr ?? '0', 10);
      const ampm = h >= 12 ? 'pm' : 'am';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const timeStr = `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
      startsAt = mergeDateAndTime(ge.date, timeStr, tz);
    } else {
      // Date only — try a direct parse as local midnight, skip if unparseable
      const d = new Date(`${ge.date}T00:00:00`);
      if (!isNaN(d.getTime())) startsAt = floatingToUTC(d, tz);
    }

    if (!startsAt || isNaN(startsAt.getTime())) continue;

    const event = toScrapedEvent(
      { title: ge.title, description: ge.description ?? undefined, startsAt: startsAt.toISOString() },
      ctx.venue,
    );
    if (event) scraped.push(event);
  }

  const succeeded = scraped.length > 0;
  console.log(`  [${ctx.venue.name}] Tier 3 — ${succeeded ? `${scraped.length} events extracted` : 'no participatory events found'}${fromRetry ? ' (after retry)' : ''}`);

  await logTier3(ctx.venue, { succeeded, eventCount: scraped.length, fromCache: false, error });
  await saveTier3State(ctx.venue, { success: succeeded, events: scraped });

  return { events: scraped, tier: ScrapeStrategy.VISION, confidence: 3 };
}

// ─── Tier registration ────────────────────────────────────────────────────────

const TIERS: TierDef[] = [
  { strategy: ScrapeStrategy.ICAL,            fn: tierIcal,           needsBrowser: false },
  { strategy: ScrapeStrategy.STATIC_HTML,     fn: tierStaticHtml,     needsBrowser: false },
  { strategy: ScrapeStrategy.PLAYWRIGHT_HTML, fn: tierPlaywrightHtml, needsBrowser: true  },
  { strategy: ScrapeStrategy.VISION,          fn: tierVision,         needsBrowser: true  },
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

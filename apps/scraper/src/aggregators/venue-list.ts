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
import { ScrapeStrategy } from '@prisma/client';
import { chromium, type Browser, type Page } from 'playwright';
import type { ScrapedEvent } from '../scrape';
import type { VenueTarget } from '../venues-nyc';
import { prisma } from '../ingest';

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

async function tierIcal(_ctx: ScrapeContext, _page: Page | null): Promise<TierResult> {
  // TODO:
  //   1. HTTP GET venue.url, parse <link rel="alternate" type="text/calendar">
  //   2. Also try common paths: /events.ics, /calendar.ics, /feed
  //   3. Parse the iCal feed with a library (e.g. node-ical)
  //   4. Filter to participatory events within the 90-day lookahead
  return { events: [], tier: ScrapeStrategy.ICAL, confidence: 5 };
}

async function tierStaticHtml(ctx: ScrapeContext, _page: Page | null): Promise<TierResult> {
  // TODO:
  //   1. node-fetch (or native fetch) to GET venue.url — store result in ctx.rawHtml
  //   2. Parse with cheerio
  //   3. Run JSON-LD extraction (script[type="application/ld+json"] → @type Event)
  //   4. Run CSS selector extraction (Squarespace, Tribe/WP, generic time[datetime])
  //   5. Run isParticipatory + toScrapedEvent filters
  return { events: [], tier: ScrapeStrategy.STATIC_HTML, confidence: 5 };
}

async function tierPlaywrightHtml(ctx: ScrapeContext, page: Page | null): Promise<TierResult> {
  // TODO:
  //   1. page is already navigated by the orchestrator — extract rendered HTML
  //   2. Store full HTML in ctx.renderedHtml
  //   3. Extract visible text (body.innerText minus nav/footer) → ctx.pageText
  //   4. Re-run JSON-LD + CSS selector logic on rendered DOM (same as Tier 1)
  //   5. This catches SPAs where Tier 1 returns empty shells
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
  { strategy: ScrapeStrategy.LLM_TEXT,        fn: tierLlmText,        needsBrowser: false },
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

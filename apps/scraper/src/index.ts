import 'dotenv/config';
import { scrapeEventsForCity } from './scrape';
import {
  ingestEvents,
  ingestAggregatedEvents,
  ageOffStaleEvents,
  wasRecentlyScraped,
  wasRecentlyAggregated,
  disconnect,
} from './ingest';
import { SCRAPE_CITIES, type CityTarget } from './cities';
import { scrapeEventbrite } from './aggregators/eventbrite';
import { scrapeVenueList } from './aggregators/venue-list';
import { NYC_VENUES } from './venues/index';

// ─── CLI flags ────────────────────────────────────────────────────────────────
// Usage:
//   pnpm --filter @on-deck/scraper scrape:claude               (Claude scraper — needs ANTHROPIC_API_KEY)
//   pnpm --filter @on-deck/scraper scrape:venues               (Venue-list tier 0/1 — no extra keys needed)
//   pnpm --filter @on-deck/scraper scrape:eb                   (Eventbrite — needs EVENTBRITE_API_KEY)
//   pnpm --filter @on-deck/scraper scrape:all                  (all sources)
//   pnpm --filter @on-deck/scraper scrape:claude -- --city "Austin"

const VALID_SOURCES = ['claude', 'eventbrite', 'venue-list', 'all'] as const;
type Source = (typeof VALID_SOURCES)[number];

function getArgs(): { cities: CityTarget[]; source: Source } {
  const args = process.argv.slice(2);

  // Use last-wins so that explicit CLI flags always override script-level defaults.
  const lastValue = (flag: string) => {
    let result: string | undefined;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === flag && i + 1 < args.length) result = args[i + 1];
    }
    return result;
  };

  const cityArg   = lastValue('--city');
  const sourceArg = lastValue('--source');

  if (!sourceArg || !VALID_SOURCES.includes(sourceArg as Source)) {
    console.error(`Error: --source is required. Valid values: ${VALID_SOURCES.join(', ')}`);
    process.exit(1);
  }

  let cities = SCRAPE_CITIES;
  if (cityArg) {
    const match = SCRAPE_CITIES.find((c) => c.city.toLowerCase() === cityArg.toLowerCase());
    if (!match) {
      console.error(`Unknown city "${cityArg}". Available: ${SCRAPE_CITIES.map((c) => c.city).join(', ')}`);
      process.exit(1);
    }
    cities = [match];
  }

  return { cities, source: sourceArg as Source };
}

// ─── Runners ─────────────────────────────────────────────────────────────────

async function runClaude(targets: CityTarget[]) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY is required for the Claude scraper. Use scrape:venues or scrape:eb to run without it.');
    process.exit(1);
  }

  const totals = { inserted: 0, skipped: 0, cities: 0, cooledDown: 0 };

  for (const target of targets) {
    console.log(`── ${target.city}, ${target.state} (Claude) ──`);

    if (await wasRecentlyScraped(target.city, target.state)) {
      console.log(`  [skip] Scraped within the last 20 hours\n`);
      totals.cooledDown++;
      continue;
    }

    try {
      const events = await scrapeEventsForCity(target);

      if (events.length === 0) {
        console.log(`  No events found\n`);
        await ingestEvents([], target);
        continue;
      }

      const { inserted, skipped } = await ingestEvents(events, target);
      totals.inserted += inserted;
      totals.skipped += skipped;
      totals.cities++;
      console.log(`  → ${inserted} inserted, ${skipped} skipped\n`);
    } catch (err) {
      console.error(`  [error] Failed to scrape ${target.city}:`, err, '\n');
    }

    if (targets.indexOf(target) < targets.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return totals;
}

async function runEventbrite(targets: CityTarget[]) {
  const apiKey = process.env.EVENTBRITE_API_KEY;
  if (!apiKey) {
    console.error('Error: EVENTBRITE_API_KEY is required for the Eventbrite scraper. Use scrape:venues or scrape:claude to run without it.');
    process.exit(1);
  }

  const totals = { inserted: 0, skipped: 0, cities: 0, cooledDown: 0 };

  for (const target of targets) {
    console.log(`── ${target.city}, ${target.state} (Eventbrite) ──`);

    if (await wasRecentlyAggregated(target.city, target.state, 'eventbrite')) {
      console.log(`  [skip] Aggregated within the last 20 hours\n`);
      totals.cooledDown++;
      continue;
    }

    try {
      const events = await scrapeEventbrite(target, apiKey);
      console.log(`  Found ${events.length} candidate events from Eventbrite`);

      const { inserted, skipped } = await ingestAggregatedEvents(events, target, 'eventbrite');
      totals.inserted += inserted;
      totals.skipped += skipped;
      totals.cities++;
      console.log(`  → ${inserted} inserted, ${skipped} skipped\n`);
    } catch (err) {
      console.error(`  [error] Failed to aggregate ${target.city}:`, err, '\n');
    }

    if (targets.indexOf(target) < targets.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return totals;
}

async function runVenueList() {
  const NYC_TARGET = { city: 'New York', state: 'NY' };
  const totals = { inserted: 0, skipped: 0, cooledDown: 0 };

  if (await wasRecentlyAggregated(NYC_TARGET.city, NYC_TARGET.state, 'venue-list')) {
    console.log(`  [skip] Venue-list scraped within the last 20 hours\n`);
    totals.cooledDown++;
    return totals;
  }

  try {
    const events = await scrapeVenueList(NYC_VENUES);
    console.log(`  Found ${events.length} candidate events from venue list`);

    const { inserted, skipped } = await ingestEvents(events, NYC_TARGET, 'venue-list');
    totals.inserted += inserted;
    totals.skipped += skipped;
    console.log(`  → ${inserted} inserted, ${skipped} skipped\n`);
  } catch (err) {
    console.error(`  [error] Venue-list scrape failed:`, err, '\n');
  }

  return totals;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { cities, source } = getArgs();

  console.log('=== On Deck — Event Aggregator ===');
  console.log(`Source:  ${source}`);
  console.log(`Cities:  ${cities.map((c) => c.city).join(', ')}`);
  console.log(`Started: ${new Date().toLocaleString()}\n`);

  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is not set.');
    process.exit(1);
  }

  // Age off stale scraper-sourced events
  console.log('[1/3] Cleaning up stale events...');
  const removed = await ageOffStaleEvents();
  console.log(`  Removed ${removed} past events\n`);

  console.log(`[2/3] Running aggregator(s)...\n`);

  const totals = { inserted: 0, skipped: 0, cities: 0, cooledDown: 0 };

  if (source === 'claude' || source === 'all') {
    const r = await runClaude(cities);
    totals.inserted += r.inserted;
    totals.skipped += r.skipped;
    totals.cities += r.cities;
    totals.cooledDown += r.cooledDown;
  }

  if (source === 'venue-list' || source === 'all') {
    const r = await runVenueList();
    totals.inserted += r.inserted;
    totals.skipped += r.skipped;
    totals.cooledDown += r.cooledDown;
  }

  if (source === 'eventbrite' || source === 'all') {
    const r = await runEventbrite(cities);
    totals.inserted += r.inserted;
    totals.skipped += r.skipped;
    totals.cities += r.cities;
    totals.cooledDown += r.cooledDown;
  }

  console.log('[3/3] Done.');
  console.log(`  Cities processed:   ${totals.cities}`);
  console.log(`  Cities on cooldown: ${totals.cooledDown}`);
  console.log(`  Events inserted:    ${totals.inserted}`);
  console.log(`  Events skipped:     ${totals.skipped}`);

  await disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

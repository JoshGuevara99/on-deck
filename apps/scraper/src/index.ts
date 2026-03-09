import 'dotenv/config';
import { scrapeEventsForCity } from './scrape';
import { ingestEvents, ageOffStaleEvents, wasRecentlyScraped, disconnect } from './ingest';
import { SCRAPE_CITIES, type CityTarget } from './cities';

// ─── CLI: optional --city filter ─────────────────────────────────────────────
// Usage:  pnpm --filter @on-deck/scraper scrape
//         pnpm --filter @on-deck/scraper scrape -- --city "Austin"

function getTargetCities(): CityTarget[] {
  const cityArg = process.argv.find((_, i) => process.argv[i - 1] === '--city');
  if (cityArg) {
    const match = SCRAPE_CITIES.find((c) => c.city.toLowerCase() === cityArg.toLowerCase());
    if (!match) {
      console.error(`Unknown city "${cityArg}". Available: ${SCRAPE_CITIES.map((c) => c.city).join(', ')}`);
      process.exit(1);
    }
    return [match];
  }
  return SCRAPE_CITIES;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== On Deck — Event Scraper ===');
  console.log(`Starting at ${new Date().toLocaleString()}\n`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY is not set.');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is not set.');
    process.exit(1);
  }

  // Step 1: clean up past events from previous scraper runs
  console.log('[1/3] Cleaning up stale events...');
  const removed = await ageOffStaleEvents();
  console.log(`  Removed ${removed} past events\n`);

  // Step 2: determine which cities to scrape
  const targets = getTargetCities();
  console.log(`[2/3] Scraping ${targets.length} cit${targets.length === 1 ? 'y' : 'ies'}...\n`);

  const totals = { inserted: 0, skipped: 0, cities: 0, cooledDown: 0 };

  for (const target of targets) {
    console.log(`── ${target.city}, ${target.state} ──`);

    // Skip cities scraped recently
    if (await wasRecentlyScraped(target.city, target.state)) {
      console.log(`  [skip] Scraped within the last 20 hours — skipping\n`);
      totals.cooledDown++;
      continue;
    }

    try {
      const events = await scrapeEventsForCity(target);

      if (events.length === 0) {
        console.log(`  No events found\n`);
        // Still record the run so we don't immediately re-scrape an empty city
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

    // Pause between cities to avoid hitting rate limits
    if (targets.indexOf(target) < targets.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Step 3: summary
  console.log('[3/3] Done.');
  console.log(`  Cities scraped:    ${totals.cities}`);
  console.log(`  Cities on cooldown: ${totals.cooledDown}`);
  console.log(`  Events inserted:   ${totals.inserted}`);
  console.log(`  Events skipped:    ${totals.skipped}`);

  await disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

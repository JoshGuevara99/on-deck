import 'dotenv/config';
import { scrapeNYCEvents } from './scrape';
import { ingestEvents } from './ingest';

async function main() {
  console.log('=== On Deck — NYC Event Scraper ===');
  console.log(`Starting at ${new Date().toLocaleString()}\n`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY is not set in your environment.');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is not set in your environment.');
    process.exit(1);
  }

  console.log('[1/2] Scraping NYC open mic events via Claude + web search...');
  const events = await scrapeNYCEvents();

  if (events.length === 0) {
    console.log('\nNo events found. Exiting.');
    process.exit(0);
  }

  console.log(`\n[2/2] Ingesting ${events.length} events into the database...`);
  const { inserted, skipped } = await ingestEvents(events);

  console.log(`\n=== Done ===`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped:  ${skipped} (duplicates or errors)`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

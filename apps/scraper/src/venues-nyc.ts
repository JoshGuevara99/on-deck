/**
 * Curated NYC venue list for the Playwright-based scraper.
 *
 * Add a venue by pasting its events/calendar URL here.
 * The scraper visits each URL weekly, extracts participatory events,
 * and ingests them into the database.
 *
 * No code changes needed when adding venues — just add a line to the array.
 */

export interface VenueTarget {
  name: string;
  url: string;
  city: string;
  state: string;
}

export const NYC_VENUES: VenueTarget[] = [
  { name: 'Bowery Poetry Club',  url: 'https://www.bowerypoetry.com/',                        city: 'New York', state: 'NY' },
  { name: 'OvationTix',          url: 'https://ci.ovationtix.com/35133',                       city: 'New York', state: 'NY' },
  { name: 'Sugar Bar',           url: 'https://www.sugarbarnyc.com/events/',                   city: 'New York', state: 'NY' },
  { name: 'Red Lion',            url: 'https://www.redlionnyc.com/live-music/',                city: 'New York', state: 'NY' },
  { name: 'Silvana',             url: 'https://silvana-nyc.com/calendar.php',                  city: 'New York', state: 'NY' },
  { name: "Otto's Shrunken Head", url: 'https://www.ottosshrunkenhead.com/pages/events.php',   city: 'New York', state: 'NY' },
  { name: 'The Pit NYC',         url: 'https://thepit-nyc.com/improv-jams-open-mics/',         city: 'New York', state: 'NY' },
];

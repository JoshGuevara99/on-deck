/**
 * NYC venue list.
 *
 * Add a venue by pasting its events/calendar page URL.
 * The scraper visits each URL, tries all tiers, and ingests participatory events.
 *
 * For Google Calendar URLs: paste the /embed?src=... link directly —
 * Tier 0 will detect the calendar ID and convert it to an iCal feed.
 */

import type { VenueTarget } from './index';

export const NYC_VENUES: VenueTarget[] = [
  // ── Poetry / Spoken Word ──────────────────────────────────────────────────
  { name: 'Bowery Poetry Club',     url: 'https://www.bowerypoetry.com/',                                                                                                                                                                                     city: 'New York', state: 'NY' },

  // ── Music / Jazz / Jam ────────────────────────────────────────────────────
  { name: 'Sugar Bar',              url: 'https://www.sugarbarnyc.com/events/',                                                                                                                                                                               city: 'New York', state: 'NY' },
  { name: 'Red Lion',               url: 'https://www.redlionnyc.com/live-music/',                                                                                                                                                                            city: 'New York', state: 'NY' },
  { name: 'Silvana',                url: 'https://silvana-nyc.com/calendar.php',                                                                                                                                                                              city: 'New York', state: 'NY' },
  { name: "Otto's Shrunken Head",   url: 'https://www.ottosshrunkenhead.com/pages/events.php',                                                                                                                                                                city: 'New York', state: 'NY' },

  // ── Comedy / Improv ───────────────────────────────────────────────────────
  { name: 'The Pit NYC',            url: 'https://thepit-nyc.com/improv-jams-open-mics/',                                                                                                                                                                     city: 'New York', state: 'NY' },
  { name: 'SoHo Playhouse',         url: 'https://www.sohoplayhouse.com/open-mics',                                                                                                                                                                           city: 'New York', state: 'NY' },
  { name: "Don't Tell Mama",        url: 'https://shows.donttellmamanyc.com/',                                                                                                                                                                                city: 'New York', state: 'NY' },
  { name: 'Eastville Comedy Club',  url: 'https://www.eastvillecomedy.com/open-mic',                                                                                                                                                                          city: 'New York', state: 'NY' },
  { name: 'UCB Comedy NYC',         url: 'https://ucbcomedy.com/shows/?_filter_locations=nyc',                                                                                                                                                                city: 'New York', state: 'NY' },
  { name: 'QED Astoria',            url: 'https://qedastoria.com/apps/events/calendar',                                                                                                                                                                       city: 'New York', state: 'NY' },
  { name: 'St. Marks Comedy Club',  url: 'https://www.stmarkscomedyclub.com/calendar',                                                                                                                                                                       city: 'New York', state: 'NY' },
  { name: 'Fun Open Mic (Punchup)', url: 'https://punchup.live/v/funyopenmic',                                                                                                                                                                                city: 'New York', state: 'NY' },

  // ── Ticketing platforms (multi-venue) ─────────────────────────────────────
  { name: 'OvationTix',             url: 'https://ci.ovationtix.com/35133',                                                                                                                                                                                   city: 'New York', state: 'NY' },

  // ── Google Calendars ──────────────────────────────────────────────────────
  // TODO: identify which venue owns this calendar and update the name
  { name: 'NYC Open Mic (Google Calendar)', url: 'https://calendar.google.com/calendar/u/0/embed?src=727bf823d917312b8095e142dc05e4ee46ae8bac27e85f3b23b94159f09d3abf@group.calendar.google.com&ctz=America/New_York&pli=1',                                city: 'New York', state: 'NY' },
];

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

const NYC = { city: 'New York', state: 'NY', timezone: 'America/New_York' } as const;

export const NYC_VENUES: VenueTarget[] = [
  // ── Poetry / Spoken Word ──────────────────────────────────────────────────
  { ...NYC, name: 'Bowery Poetry Club',       url: 'https://www.bowerypoetry.com/',                    calendarSelector: '[class*="content-inner has-content"]', lat: 40.724967967585535, lng: -73.99274021569478 },
  { ...NYC, name: 'Nuyorican Poets Cafe',     url: 'https://ci.ovationtix.com/35133',                  calendarSelector: '.calendar',                             lat: 40.721994324590064, lng: -73.98178628559464 },

  // ── Music / Jazz / Jam ────────────────────────────────────────────────────
  { ...NYC, name: 'Sugar Bar',                url: 'https://www.sugarbarnyc.com/events/',                                                                         lat: 40.7799392839558,   lng: -73.98383122912361 },
  { ...NYC, name: 'Silvana',                  url: 'https://silvana-nyc.com/calendar.php',                                                                        lat: 40.8051478998578,   lng: -73.95592344445161 },
  { ...NYC, name: "Otto's Shrunken Head",     url: 'https://www.ottosshrunkenhead.com/pages/events.php',                                                          lat: 40.72961737552008,  lng: -73.97868240671815 },

  // ── Comedy / Improv ───────────────────────────────────────────────────────
  { ...NYC, name: 'The Pit NYC',              url: 'https://thepit-nyc.com/improv-jams-open-mics/',                                                               lat: 40.74802168986839,  lng: -73.99226182914516 },
  { ...NYC, name: 'SoHo Playhouse',           url: 'https://www.sohoplayhouse.com/open-mics',                                                                     lat: 40.72664532911848,  lng: -74.00437966441197 },
  { ...NYC, name: "Don't Tell Mama",          url: 'https://shows.donttellmamanyc.com/',                                                                          lat: 40.760760739384,    lng: -73.98953034325939 },
  { ...NYC, name: 'Eastville Comedy Club',    url: 'https://www.eastvillecomedy.com/open-mic',          calendarSelector: '[class*="grid-cols-4 gap-6"]',          lat: 40.686539248344644, lng: -73.98157492918659 },
  { ...NYC, name: 'QED Astoria',              url: 'https://qedastoria.com/apps/events/calendar',                                                                  lat: 40.775647729663966, lng: -73.91490270888916 },
  { ...NYC, name: 'St. Marks Comedy Club',    url: 'https://www.stmarkscomedyclub.com/calendar',                                                                   lat: 40.72912855372477,  lng: -73.98920108008112 },
  { ...NYC, name: 'The New York Comedy School', url: 'https://punchup.live/v/funyopenmic' },

  // ── Brooklyn ──────────────────────────────────────────────────────────────
  { ...NYC, name: "Pete's Candy Store",       url: 'https://www.petescandystore.com/events-and-series', calendarSelector: '[class*="sectionWithImage"]',          lat: 40.71816766349998,  lng: -73.95015549358304 },
  { ...NYC, name: 'Brooklyn Music Kitchen',   url: 'https://brooklynmusickitchen.com/calendar/',        calendarSelector: '.elementor-container.elementor-column-gap-default', lat: 40.69265723589378, lng: -73.9695756484662 },
  { ...NYC, name: 'Pine Box Rock Shop',       url: 'https://www.pineboxrockshop.com/event-calender',    calendarSelector: '.LWbAav.Kv1aVt',                       lat: 40.705436509121824, lng: -73.9327320709154 },
  { ...NYC, name: "Freddy's Bar",             url: 'https://www.freddysbar.com/',                        calendarSelector: '.yui3-calendar-grid',                  lat: 40.66324717784527,  lng: -73.99112862614292 },
  { ...NYC, name: 'Roots Brooklyn',           url: 'https://www.rootsbrooklyn.com/calender',                                                                       lat: 40.66300770355304,  lng: -73.99167839417579 },
  { ...NYC, name: 'pinkFrog Cafe',            url: 'https://www.keepsakehouse.com/shows',                                                                          lat: 40.717777063457156, lng: -73.95449387975196 },

  // ── Google Calendars ──────────────────────────────────────────────────────
  { ...NYC, name: 'The Grisly Pear',          url: 'https://calendar.google.com/calendar/u/0/embed?src=727bf823d917312b8095e142dc05e4ee46ae8bac27e85f3b23b94159f09d3abf@group.calendar.google.com&ctz=America/New_York&pli=1', lat: 40.72984297673145, lng: -74.00077404450724 },
];

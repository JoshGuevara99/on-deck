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
  { ...NYC, name: 'Bowery Poetry Club',     url: 'https://www.bowerypoetry.com/'                                                                                                                                                                                     },

  // ── Music / Jazz / Jam ────────────────────────────────────────────────────
  { ...NYC, name: 'Sugar Bar',              url: 'https://www.sugarbarnyc.com/events/'                                                                                                                                                                               },
  { ...NYC, name: 'Red Lion',               url: 'https://www.redlionnyc.com/live-music/'                                                                                                                                                                            },
  { ...NYC, name: 'Silvana',                url: 'https://silvana-nyc.com/calendar.php'                                                                                                                                                                              },
  { ...NYC, name: "Otto's Shrunken Head",   url: 'https://www.ottosshrunkenhead.com/pages/events.php'                                                                                                                                                                },

  // ── Comedy / Improv ───────────────────────────────────────────────────────
  { ...NYC, name: 'The Pit NYC',            url: 'https://thepit-nyc.com/improv-jams-open-mics/'                                                                                                                                                                     },
  { ...NYC, name: 'SoHo Playhouse',         url: 'https://www.sohoplayhouse.com/open-mics'                                                                                                                                                                           },
  { ...NYC, name: "Don't Tell Mama",        url: 'https://shows.donttellmamanyc.com/'                                                                                                                                                                                },
  { ...NYC, name: 'Eastville Comedy Club',  url: 'https://www.eastvillecomedy.com/open-mic'                                                                                                                                                                          },
  { ...NYC, name: 'UCB Comedy NYC',         url: 'https://ucbcomedy.com/shows/?_filter_locations=nyc'                                                                                                                                                                },
  { ...NYC, name: 'QED Astoria',            url: 'https://qedastoria.com/apps/events/calendar'                                                                                                                                                                       },
  { ...NYC, name: 'St. Marks Comedy Club',  url: 'https://www.stmarkscomedyclub.com/calendar'                                                                                                                                                                       },
  { ...NYC, name: 'Fun Open Mic (Punchup)', url: 'https://punchup.live/v/funyopenmic'                                                                                                                                                                                },

  // ── Ticketing platforms (multi-venue) ─────────────────────────────────────
  { ...NYC, name: 'OvationTix',             url: 'https://ci.ovationtix.com/35133'                                                                                                                                                                                   },

  // ── Google Calendars ──────────────────────────────────────────────────────
  // TODO: identify which venue owns this calendar and update the name
  { ...NYC, name: 'NYC Open Mic (Google Calendar)', url: 'https://calendar.google.com/calendar/u/0/embed?src=727bf823d917312b8095e142dc05e4ee46ae8bac27e85f3b23b94159f09d3abf@group.calendar.google.com&ctz=America/New_York&pli=1' },
];

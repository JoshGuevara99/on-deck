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
  { ...NYC, name: 'Bowery Poetry Club',     url: 'https://www.bowerypoetry.com/',          calendarSelector: '[class*="content-inner has-content"]'                                                                                                              },

  // ── Music / Jazz / Jam ────────────────────────────────────────────────────
  { ...NYC, name: 'Sugar Bar',              url: 'https://www.sugarbarnyc.com/events/'                                                                                                                                                                               },
  { ...NYC, name: 'Silvana',                url: 'https://silvana-nyc.com/calendar.php'                                                                                                                                                                              },
  { ...NYC, name: "Otto's Shrunken Head",   url: 'https://www.ottosshrunkenhead.com/pages/events.php'                                                                                                                                                                },

  // ── Comedy / Improv ───────────────────────────────────────────────────────
  { ...NYC, name: 'The Pit NYC',            url: 'https://thepit-nyc.com/improv-jams-open-mics/'                                                                                                                                                                     },
  { ...NYC, name: 'SoHo Playhouse',         url: 'https://www.sohoplayhouse.com/open-mics'                                                                                                                                                                           },
  { ...NYC, name: "Don't Tell Mama",        url: 'https://shows.donttellmamanyc.com/'                                                                                                                                                                                },
  { ...NYC, name: 'Eastville Comedy Club',  url: 'https://www.eastvillecomedy.com/open-mic',       calendarSelector: '[class*="grid-cols-4 gap-6"]'                                                                                                             },
  { ...NYC, name: 'QED Astoria',            url: 'https://qedastoria.com/apps/events/calendar'                                                                                                                                                                       },
  { ...NYC, name: 'St. Marks Comedy Club',  url: 'https://www.stmarkscomedyclub.com/calendar'                                                                                                                                                                       },
  { ...NYC, name: 'The New York Comedy School', url: 'https://punchup.live/v/funyopenmic'                                                                                                                                                                                },

  // ── Brooklyn ──────────────────────────────────────────────────────────────
  { ...NYC, name: "Pete's Candy Store",     url: 'https://www.petescandystore.com/events-and-series',  calendarSelector: '[class*="sectionWithImage"]'                                                                                                              },
  { ...NYC, name: 'Brooklyn Music Kitchen', url: 'https://brooklynmusickitchen.com/calendar/',     calendarSelector: '.elementor-container.elementor-column-gap-default'                                                                                        },
  { ...NYC, name: 'Pine Box Rock Shop',     url: 'https://www.pineboxrockshop.com/event-calender',     calendarSelector: '.LWbAav.Kv1aVt'                                                                                                                          },
  { ...NYC, name: "Freddy's Bar",           url: 'https://www.freddysbar.com/',                        calendarSelector: '.yui3-calendar-grid'                                                                                                                      },
  { ...NYC, name: 'The Coffee Box',         url: 'https://www.cofbx.com/thursdays/',                   calendarSelector: '.entry-container'                                                                                                                         },
  { ...NYC, name: 'Roots Brooklyn',         url: 'https://www.rootsbrooklyn.com/calender'                                                                                                                                                                              },
  { ...NYC, name: 'Keepsake House',         url: 'https://www.keepsakehouse.com/shows'                                                                                                                                                                                 },

  // ── Ticketing platforms (multi-venue) ─────────────────────────────────────
  { ...NYC, name: 'Nuyorican Poets Cafe',   url: 'https://ci.ovationtix.com/35133',                    calendarSelector: '.calendar'                                                                                                                            },

  // ── Google Calendars ──────────────────────────────────────────────────────
  // TODO: identify which venue owns this calendar and update the name
  { ...NYC, name: 'The Grisly Pear', url: 'https://calendar.google.com/calendar/u/0/embed?src=727bf823d917312b8095e142dc05e4ee46ae8bac27e85f3b23b94159f09d3abf@group.calendar.google.com&ctz=America/New_York&pli=1' },
];

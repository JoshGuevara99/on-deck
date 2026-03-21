/**
 * Venue registry — one file per city.
 *
 * To add a new venue: find the right city file and add a line to the array.
 * No other code changes needed.
 *
 * To add a new city: create a new file (e.g. boston.ts), export a BOSTON_VENUES
 * array, import it here, and add it to ALL_VENUES.
 */

export interface VenueTarget {
  name: string;
  url: string;
  city: string;
  state: string;
}

export { NYC_VENUES } from './nyc';

import { NYC_VENUES } from './nyc';

/** Every venue across all cities — used for full runs. */
export const ALL_VENUES: VenueTarget[] = [
  ...NYC_VENUES,
];

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
  /**
   * IANA timezone name for this venue.
   * Used to correctly interpret "floating" datetimes in iCal feeds and
   * date-only values in HTML — feeds that omit timezone info are assumed
   * to be in this timezone rather than UTC.
   * Defaults to 'America/New_York' in all extraction helpers.
   */
  timezone?: string;
}

export { NYC_VENUES } from './nyc';

import { NYC_VENUES } from './nyc';

/** Every venue across all cities — used for full runs. */
export const ALL_VENUES: VenueTarget[] = [
  ...NYC_VENUES,
];

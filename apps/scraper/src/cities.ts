export interface CityTarget {
  city: string;  // canonical name — used in DB and passed to Claude
  state: string; // 2-letter state code
}

// Phase 1: hardcoded list of US cities with active open mic scenes.
// Phase 2: replace getCitiesToScrape() with a DB query:
//   SELECT DISTINCT city, state FROM "User" WHERE city IS NOT NULL
//   (once users store their city preference)
export const SCRAPE_CITIES: CityTarget[] = [
  { city: 'New York',      state: 'NY' },
  { city: 'Los Angeles',   state: 'CA' },
  { city: 'Chicago',       state: 'IL' },
  { city: 'Austin',        state: 'TX' },
  { city: 'Nashville',     state: 'TN' },
  { city: 'San Francisco', state: 'CA' },
  { city: 'Seattle',       state: 'WA' },
  { city: 'Portland',      state: 'OR' },
  { city: 'Atlanta',       state: 'GA' },
  { city: 'Boston',        state: 'MA' },
  { city: 'Philadelphia',  state: 'PA' },
  { city: 'Denver',        state: 'CO' },
  { city: 'New Orleans',   state: 'LA' },
  { city: 'Washington',    state: 'DC' },
];

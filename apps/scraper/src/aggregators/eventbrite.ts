/**
 * Eventbrite aggregator
 *
 * Searches Eventbrite for participatory performance events (open mics, jam
 * sessions, comedy open mics, poetry slams) in a given city. These are
 * events where performers sign up — NOT ticketed shows.
 *
 * API docs: https://www.eventbrite.com/platform/api
 * Auth: personal OAuth token (read-only is sufficient)
 *
 * Rate limits: 1,000 calls/hour on the free tier.
 * We make ~1 call per keyword per city, so 8 calls per city — well within limits.
 */

import type { CityTarget } from '../cities';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AggregatedEvent {
  externalId: string;
  source: 'EVENTBRITE';
  title: string;
  description: string | null;
  startsAt: string; // ISO-8601 UTC
  endsAt: string | null;
  type: 'OPEN_MIC' | 'JAM_SESSION' | 'COMEDY_NIGHT' | 'POETRY_SLAM' | 'OPEN_STAGE' | 'WORKSHOP' | 'OPEN_STUDIO';
  coverCharge: string;
  signUpMethod: 'DOOR' | 'ONLINE';
  isRecurring: boolean;
  genres: string[];
  backline: string[];
  venue: {
    name: string;
    address: string;
    city: string;
    state: string;
    lat: number | undefined;
    lng: number | undefined;
  };
}

// ─── Eventbrite API shapes ────────────────────────────────────────────────────

interface EBAddress {
  address_1: string | null;
  city: string | null;
  region: string | null; // state abbreviation
  latitude: string | null;
  longitude: string | null;
}

interface EBVenue {
  name: string | null;
  address: EBAddress;
}

interface EBTicketAvailability {
  minimum_ticket_price?: { major_value: string };
}

interface EBEvent {
  id: string;
  name: { text: string };
  description: { text: string } | null;
  start: { utc: string };
  end: { utc: string } | null;
  is_free: boolean;
  ticket_availability: EBTicketAvailability | null;
  venue: EBVenue | null;
}

interface EBSearchResponse {
  events: EBEvent[];
  pagination: {
    has_more_items: boolean;
    page_count: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = 'https://www.eventbriteapi.com/v3';

// Keywords that signal participatory/sign-up events rather than ticketed shows
const SEARCH_KEYWORDS = [
  'open mic',
  'open stage',
  'jam session',
  'comedy open mic',
  'poetry slam',
  'open jam',
  'singer songwriter open',
  'open mic night',
];

// Events over $25 are almost certainly shows, not sign-up nights
const MAX_PRICE_DOLLARS = 25;

// Eventbrite category IDs — Music (103) and Performing & Visual Arts (105)
const CATEGORIES = '103,105';

// How many days ahead to search
const DAYS_AHEAD = 30;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inferEventType(title: string): AggregatedEvent['type'] {
  const t = title.toLowerCase();
  if (/open.?mic|open mike/.test(t)) return 'OPEN_MIC';
  if (/open stage/.test(t)) return 'OPEN_STAGE';
  if (/open studio/.test(t)) return 'OPEN_STUDIO';
  if (/jam session|jam night|open jam|blues jam|jazz jam/.test(t)) return 'JAM_SESSION';
  if (/comedy night|comedy show|stand.?up night|standup night/.test(t)) return 'COMEDY_NIGHT';
  if (/poetry slam|spoken word slam|open slam|slam night/.test(t)) return 'POETRY_SLAM';
  if (/workshop/.test(t)) return 'WORKSHOP';
  if (/comedy/.test(t)) return 'COMEDY_NIGHT';
  if (/\bslam\b/.test(t)) return 'POETRY_SLAM';
  return 'OPEN_MIC';
}

function parseCoverCharge(event: EBEvent): string {
  if (event.is_free) return 'Free';
  const price = event.ticket_availability?.minimum_ticket_price?.major_value;
  return price ? `$${price}` : 'See listing';
}

function isTooExpensive(event: EBEvent): boolean {
  if (event.is_free) return false;
  const price = event.ticket_availability?.minimum_ticket_price?.major_value;
  if (!price) return false; // unknown price — let it through
  return parseFloat(price) > MAX_PRICE_DOLLARS;
}

function mapToAggregatedEvent(event: EBEvent): AggregatedEvent | null {
  if (!event.venue) return null;

  const address = event.venue.address;
  if (!address.address_1 || !address.city || !address.region) return null;

  const title = event.name.text;
  const description = event.description?.text ?? null;

  return {
    externalId: event.id,
    source: 'EVENTBRITE',
    title,
    description,
    startsAt: event.start.utc,
    endsAt: event.end?.utc ?? null,
    type: inferEventType(title),
    coverCharge: parseCoverCharge(event),
    signUpMethod: 'DOOR', // open mics are typically sign-up at the door
    isRecurring: false, // Eventbrite doesn't expose recurrence cleanly
    genres: [],
    backline: [],
    venue: {
      name: event.venue.name ?? address.address_1,
      address: address.address_1,
      city: address.city,
      state: address.region,
      lat: address.latitude ? parseFloat(address.latitude) : undefined,
      lng: address.longitude ? parseFloat(address.longitude) : undefined,
    },
  };
}

// ─── API fetch ────────────────────────────────────────────────────────────────

async function fetchKeyword(
  apiKey: string,
  keyword: string,
  target: CityTarget,
  startDate: string,
  endDate: string,
): Promise<EBEvent[]> {
  const params = new URLSearchParams({
    q: keyword,
    'location.address': `${target.city}, ${target.state}`,
    'location.within': '15mi',
    'start_date.range_start': startDate,
    'start_date.range_end': endDate,
    categories: CATEGORIES,
    expand: 'venue,ticket_availability',
    page_size: '50',
  });

  const url = `${API_BASE}/events/search/?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Eventbrite API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as EBSearchResponse;
  return data.events ?? [];
}

// ─── Public ───────────────────────────────────────────────────────────────────

export async function scrapeEventbrite(
  target: CityTarget,
  apiKey: string,
): Promise<AggregatedEvent[]> {
  const now = new Date();
  const future = new Date(now);
  future.setDate(future.getDate() + DAYS_AHEAD);

  const startDate = now.toISOString();
  const endDate = future.toISOString();

  // Deduplicate across keyword searches by Eventbrite event ID
  const seen = new Map<string, EBEvent>();

  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const events = await fetchKeyword(apiKey, keyword, target, startDate, endDate);
      for (const event of events) {
        if (!seen.has(event.id)) seen.set(event.id, event);
      }
      // Small delay between keyword searches to be polite
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.warn(`  [eventbrite] keyword "${keyword}" failed:`, err);
    }
  }

  const results: AggregatedEvent[] = [];
  for (const event of seen.values()) {
    // Filter out expensive ticketed shows
    if (isTooExpensive(event)) continue;

    // Only include events in the target city (Eventbrite's radius can bleed over)
    const venueCity = event.venue?.address.city?.toLowerCase() ?? '';
    const venueState = event.venue?.address.region?.toLowerCase() ?? '';
    const targetCity = target.city.toLowerCase();
    const targetState = target.state.toLowerCase();
    if (venueState !== targetState) continue;
    if (!venueCity.includes(targetCity) && !targetCity.includes(venueCity)) continue;

    const mapped = mapToAggregatedEvent(event);
    if (mapped) results.push(mapped);
  }

  return results;
}

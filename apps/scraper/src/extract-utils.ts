/**
 * Shared helpers used by all scraper tiers.
 *
 * Kept separate so each tier file stays focused on its extraction logic.
 */

import { ScrapedEventSchema, type ScrapedEvent } from './scrape';
import type { VenueTarget } from './venues/index';

// ─── Constants ────────────────────────────────────────────────────────────────

export const LOOKAHEAD_DAYS = 90;

export const DEFAULT_TIMEZONE = 'America/New_York';

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function todayStr(): string {
  return new Date().toISOString().split('T')[0]!;
}

export function maxDateStr(): string {
  return new Date(Date.now() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]!;
}

export function isFuture(date: Date): boolean {
  return date.getTime() > Date.now();
}

export function isWithinLookahead(date: Date): boolean {
  return date.getTime() < Date.now() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Returns true if the time component is exactly midnight (00:00:00.000).
 * Used to detect date-only values that slipped through without a real time.
 */
export function isMidnight(date: Date): boolean {
  return date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
}

/**
 * How many minutes `tz` is behind UTC at the given moment.
 * America/New_York in summer (EDT) = 240, in winter (EST) = 300.
 */
function tzOffsetMinutes(tz: string, at: Date): number {
  const utcDate = new Date(at.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate  = new Date(at.toLocaleString('en-US', { timeZone: tz }));
  return Math.round((utcDate.getTime() - tzDate.getTime()) / 60_000);
}

/**
 * Converts a "floating" datetime (no timezone info, parsed naively as UTC by
 * node-ical or cheerio) to the correct UTC instant for the venue's timezone.
 *
 * Example: floating "2026-03-22T17:30:00" in America/New_York (EDT, UTC-4)
 *   → stored as 2026-03-22T17:30:00.000Z by the parser
 *   → correct UTC = 2026-03-22T21:30:00.000Z  (17:30 + 4h offset)
 */
export function floatingToUTC(date: Date, tz: string = DEFAULT_TIMEZONE): Date {
  const offsetMs = tzOffsetMinutes(tz, date) * 60_000;
  return new Date(date.getTime() + offsetMs);
}

/**
 * Extracts a time string (e.g. "5:30 PM", "7pm", "19:30") from arbitrary text.
 * Returns null if no time-like pattern is found.
 */
export function extractTimeFromText(text: string): string | null {
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)\b/);
  if (!match) return null;
  const hour = match[1]!;
  const min  = match[2] ?? '00';
  const ampm = match[3]!.toLowerCase();
  return `${hour}:${min} ${ampm}`;
}

/**
 * Merges a date-only string (e.g. "2026-03-22") with a time string (e.g. "5:30 pm")
 * into a full ISO datetime interpreted in the given timezone.
 * Returns null if parsing fails.
 */
export function mergeDateAndTime(dateStr: string, timeStr: string, tz: string = DEFAULT_TIMEZONE): Date | null {
  // Parse the time string to hours + minutes
  const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)/i);
  if (!match) return null;

  let hours   = parseInt(match[1]!, 10);
  const mins  = parseInt(match[2] ?? '0', 10);
  const isPM  = /pm/i.test(match[3]!);

  if (isPM && hours !== 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;

  // Build a "floating" datetime string (no TZ)
  const floating = `${dateStr}T${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
  const naiveDate = new Date(floating + 'Z'); // treat naively as UTC first
  if (isNaN(naiveDate.getTime())) return null;

  return floatingToUTC(naiveDate, tz);
}

// ─── Event classification ─────────────────────────────────────────────────────

export function inferEventType(title: string, description: string): ScrapedEvent['type'] {
  const text = `${title} ${description}`.toLowerCase();
  if (/jam session|jam night|open jam|blues jam|jazz jam/.test(text)) return 'JAM_SESSION';
  if (/comedy|stand-?up|standup/.test(text)) return 'COMEDY_NIGHT';
  if (/poetry|slam|spoken word/.test(text)) return 'POETRY_SLAM';
  if (/workshop/.test(text)) return 'WORKSHOP';
  if (/open studio/.test(text)) return 'OPEN_STUDIO';
  if (/open stage/.test(text)) return 'OPEN_STAGE';
  return 'OPEN_MIC';
}

/**
 * Infers genre tags from event title, description, and venue name.
 * Returns a subset of ["Comedy", "Music", "Poetry"] — or [] if nothing is clear.
 *
 * Venue name is a strong signal for Comedy (e.g. "Eastville Comedy Club").
 * Music is inferred from explicit keywords only — venue name alone is too broad.
 */
export function inferGenres(title: string, description: string, venueName: string): string[] {
  const eventText = `${title} ${description}`.toLowerCase();
  const venueText = venueName.toLowerCase();
  const genres: string[] = [];

  if (
    /\b(comedy|comedian|stand.?up|standup|improv|comic)\b/.test(eventText) ||
    /\bcomedy\b/.test(venueText)
  ) {
    genres.push('Comedy');
  }

  if (/\b(poetry|poem|poet|spoken.?word|slam)\b/.test(eventText)) {
    genres.push('Poetry');
  }

  if (
    /\b(music|acoustic|jazz|blues|songwriter|sing|song|band|guitar|piano|bass|drum|hip.?hop|folk|country|rock|reggae|funk|soul|r&b|rnb|bluegrass|instrument|open.?jam|jam.?session)\b/.test(eventText)
  ) {
    genres.push('Music');
  }

  return genres;
}

/**
 * Returns true if the title or description suggests a participatory event
 * where audience members can sign up to perform.
 */
export function isParticipatory(title: string, description = ''): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return /open mic|open-mic|open mike|jam session|jam night|open jam|open stage|open floor|blues jam|jazz jam|acoustic jam|songwriter|writers.round|song circle|bluegrass jam|folk circle|session night|comedy open mic|stand.?up|spoken word|poetry slam|story slam|karaoke|sit.?in|bring your instrument|sign up to perform|musicians welcome|share your talent|mic night|talent night|community stage/.test(
    text,
  );
}

// ─── ScrapedEvent builder ─────────────────────────────────────────────────────

export interface RawEventFields {
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  address?: string;
  venueName?: string;
  isRecurring?: boolean;
  recurringDescription?: string;
}

/**
 * Returns true if a datetime string has no timezone info (no Z, no +HH:MM, no -HH:MM).
 * These "floating" strings must be interpreted in the venue's local timezone.
 */
function isFloatingString(s: string): boolean {
  return !/Z$|[+-]\d{2}:?\d{2}$/.test(s.trim());
}

export function toScrapedEvent(fields: RawEventFields, venue: VenueTarget): ScrapedEvent | null {
  const tz = venue.timezone ?? DEFAULT_TIMEZONE;

  // If the caller passed a floating datetime string (no TZ offset), treat it as
  // venue local time rather than UTC — the last safeguard before storing.
  const rawStart = fields.startsAt.includes('T') && isFloatingString(fields.startsAt)
    ? floatingToUTC(new Date(fields.startsAt + 'Z'), tz)
    : new Date(fields.startsAt);

  const startsAt = rawStart;
  if (isNaN(startsAt.getTime()) || !isFuture(startsAt) || !isWithinLookahead(startsAt)) {
    return null;
  }
  if (!isParticipatory(fields.title, fields.description)) return null;

  const result = ScrapedEventSchema.safeParse({
    title: fields.title,
    description: fields.description,
    startsAt: startsAt.toISOString(),
    endsAt: fields.endsAt,
    type: inferEventType(fields.title, fields.description ?? ''),
    genres: inferGenres(fields.title, fields.description ?? '', fields.venueName ?? venue.name),
    backline: [],
    signUpMethod: 'DOOR',
    isRecurring: fields.isRecurring ?? false,
    recurringDescription: fields.recurringDescription,
    venue: {
      name: fields.venueName ?? venue.name,
      address: fields.address ?? venue.city,
      city: venue.city,
      state: venue.state,
    },
  });

  return result.success ? result.data : null;
}

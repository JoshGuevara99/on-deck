/**
 * Shared helpers used by all scraper tiers.
 *
 * Kept separate so each tier file stays focused on its extraction logic.
 */

import { ScrapedEventSchema, type ScrapedEvent } from './scrape';
import type { VenueTarget } from './venues-nyc';

// ─── Constants ────────────────────────────────────────────────────────────────

export const LOOKAHEAD_DAYS = 90;

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
 * Validates and coerces raw extracted fields into a ScrapedEvent.
 * Returns null if the event fails any filter (past, too far out, not participatory).
 */
export function toScrapedEvent(fields: RawEventFields, venue: VenueTarget): ScrapedEvent | null {
  const startsAt = new Date(fields.startsAt);
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
    genres: [],
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

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { findOrCreateVenue } from './venues.service';
import type { CreateEventInput, EventFilters } from '@on-deck/shared';

/** Prisma select that always includes the venue + signup/attendee counts. */
const WITH_VENUE_AND_COUNTS = {
  include: {
    venue: true,
    _count: { select: { signups: true, attendees: true } },
  },
} satisfies Prisma.EventDefaultArgs;

/** Shape the raw Prisma result into the ApiEvent shape (adds signupCount/attendeeCount). */
function toApiEvent(event: Prisma.EventGetPayload<typeof WITH_VENUE_AND_COUNTS>) {
  const { _count, ...rest } = event;
  return {
    ...rest,
    signupCount: _count.signups,
    attendeeCount: _count.attendees,
  };
}

export async function listEvents(filters: EventFilters = {}) {
  const where: Prisma.EventWhereInput = {};

  if (filters.type) {
    const types = filters.type.split(',').map((t) => t.trim()) as Prisma.EnumEventTypeFilter['in'];
    where.type = { in: types };
  }

  if (filters.city) {
    where.city = { equals: filters.city, mode: 'insensitive' };
  }

  if (filters.tonight) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    where.startsAt = { gte: todayStart, lt: todayEnd };
  }

  if (filters.from || filters.to) {
    where.startsAt = {};
    if (filters.from) where.startsAt.gte = new Date(filters.from);
    if (filters.to) where.startsAt.lte = new Date(filters.to);
  }

  if (filters.free) {
    where.coverCharge = { equals: 'Free', mode: 'insensitive' };
  }

  if (filters.submittedBy) {
    where.submittedBy = filters.submittedBy;
  }

  if (filters.hostId) {
    where.hostId = filters.hostId;
  }

  if (filters.genre) {
    where.genres = { has: filters.genre };
  }

  if (filters.q) {
    const q = filters.q.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { genres: { has: q } },
      { venue: { name: { contains: q, mode: 'insensitive' } } },
      { venue: { neighborhood: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const events = await prisma.event.findMany({
    where,
    ...WITH_VENUE_AND_COUNTS,
    orderBy: { startsAt: 'asc' },
    take: filters.limit ?? 50,
    skip: filters.offset ?? 0,
  });

  return events.map(toApiEvent);
}

export async function getEvent(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    ...WITH_VENUE_AND_COUNTS,
  });
  if (!event) return null;
  return toApiEvent(event);
}

export async function createEvent(input: CreateEventInput, submittedBy?: string) {
  const venue = await findOrCreateVenue(input.venue);

  const event = await prisma.event.create({
    data: {
      venueId: venue.id,
      city: input.venue.city,
      state: input.venue.state,
      title: input.title,
      description: input.description ?? null,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      type: input.type,
      genres: input.genres ?? [],
      coverCharge: input.coverCharge ?? null,
      slotDuration: input.slotDuration ?? null,
      backline: input.backline ?? [],
      signUpMethod: input.signUpMethod ?? 'DOOR',
      isRecurring: input.isRecurring ?? false,
      recurringDescription: input.recurringDescription ?? null,
      submittedBy: submittedBy ?? null,
      hostId: submittedBy ?? null,
      signupsEnabled: input.signupsEnabled ?? false,
      maxSlots: input.maxSlots ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      coverImageThumb: input.coverImageThumb ?? null,
      coverImagePhotographer: input.coverImagePhotographer ?? null,
      coverImagePhotographerUrl: input.coverImagePhotographerUrl ?? null,
      coverImageAttribution: input.coverImageAttribution ?? null,
    },
    ...WITH_VENUE_AND_COUNTS,
  });

  return toApiEvent(event);
}

export async function updateEvent(
  eventId: string,
  hostId: string,
  input: Partial<{
    title: string;
    description: string | null;
    startsAt: string;
    endsAt: string | null;
    type: string;
    genres: string[];
    coverCharge: string | null;
    slotDuration: string | null;
    backline: string[];
    signUpMethod: string;
    isRecurring: boolean;
    recurringDescription: string | null;
    signupsEnabled: boolean;
    maxSlots: number | null;
    coverImageUrl?: string | null;
    coverImageThumb?: string | null;
    coverImagePhotographer?: string | null;
    coverImagePhotographerUrl?: string | null;
    coverImageAttribution?: string | null;
  }>
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });
  if (event.hostId !== hostId) throw Object.assign(new Error('Only the host can edit this event'), { status: 403 });

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.startsAt !== undefined && { startsAt: new Date(input.startsAt) }),
      ...(input.endsAt !== undefined && { endsAt: input.endsAt ? new Date(input.endsAt) : null }),
      ...(input.type !== undefined && { type: input.type as any }),
      ...(input.genres !== undefined && { genres: input.genres }),
      ...(input.coverCharge !== undefined && { coverCharge: input.coverCharge }),
      ...(input.slotDuration !== undefined && { slotDuration: input.slotDuration }),
      ...(input.backline !== undefined && { backline: input.backline }),
      ...(input.signUpMethod !== undefined && { signUpMethod: input.signUpMethod as any }),
      ...(input.isRecurring !== undefined && { isRecurring: input.isRecurring }),
      ...(input.recurringDescription !== undefined && { recurringDescription: input.recurringDescription }),
      ...(input.signupsEnabled !== undefined && { signupsEnabled: input.signupsEnabled }),
      ...(input.maxSlots !== undefined && { maxSlots: input.maxSlots }),
      ...(input.coverImageUrl !== undefined && { coverImageUrl: input.coverImageUrl }),
      ...(input.coverImageThumb !== undefined && { coverImageThumb: input.coverImageThumb }),
      ...(input.coverImagePhotographer !== undefined && { coverImagePhotographer: input.coverImagePhotographer }),
      ...(input.coverImagePhotographerUrl !== undefined && { coverImagePhotographerUrl: input.coverImagePhotographerUrl }),
      ...(input.coverImageAttribution !== undefined && { coverImageAttribution: input.coverImageAttribution }),
    },
    ...WITH_VENUE_AND_COUNTS,
  });

  return toApiEvent(updated);
}

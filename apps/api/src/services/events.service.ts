import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { findOrCreateVenue } from './venues.service';
import type { CreateEventInput, EventFilters } from '@on-deck/shared';

/** Prisma select that always includes the venue inline. */
const WITH_VENUE = {
  include: { venue: true },
} satisfies Prisma.EventDefaultArgs;

export async function listEvents(filters: EventFilters = {}) {
  const where: Prisma.EventWhereInput = { isApproved: true };

  // Type filter — comma-separated e.g. "OPEN_MIC,JAM_SESSION"
  if (filters.type) {
    const types = filters.type.split(',').map((t) => t.trim()) as Prisma.EnumEventTypeFilter['in'];
    where.type = { in: types };
  }

  // City filter — event.city is backfilled from venue on all existing rows, populated on new ones
  if (filters.city) {
    where.city = { equals: filters.city, mode: 'insensitive' };
  }

  // Tonight — events that start today (local midnight → next midnight)
  if (filters.tonight) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    where.startsAt = { gte: todayStart, lt: todayEnd };
  }

  // Date range filters (override tonight if both supplied)
  if (filters.from || filters.to) {
    where.startsAt = {};
    if (filters.from) where.startsAt.gte = new Date(filters.from);
    if (filters.to) where.startsAt.lte = new Date(filters.to);
  }

  // Free events
  if (filters.free) {
    where.coverCharge = { equals: 'Free', mode: 'insensitive' };
  }

  // Filter by submitter
  if (filters.submittedBy) {
    where.submittedBy = filters.submittedBy;
  }

  // Full-text search across title + description + genres
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

  return prisma.event.findMany({
    where,
    ...WITH_VENUE,
    orderBy: { startsAt: 'asc' },
    take: filters.limit ?? 50,
    skip: filters.offset ?? 0,
  });
}

export async function createEvent(input: CreateEventInput, submittedBy?: string) {
  const venue = await findOrCreateVenue(input.venue);

  return prisma.event.create({
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
    },
    ...WITH_VENUE,
  });
}


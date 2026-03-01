import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { findOrCreateVenue } from './venues.service';
import type { CreateEventInput, UpdateEventInput, EventFilters } from '@on-deck/shared';

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

  // City filter
  if (filters.city) {
    where.venue = { city: { equals: filters.city, mode: 'insensitive' } };
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

export async function getEvent(id: string) {
  return prisma.event.findUniqueOrThrow({ where: { id }, ...WITH_VENUE });
}

export async function createEvent(input: CreateEventInput, submittedBy?: string) {
  const venue = await findOrCreateVenue(input.venue);

  return prisma.event.create({
    data: {
      venueId: venue.id,
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

export async function updateEvent(id: string, input: UpdateEventInput) {
  return prisma.event.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.startsAt !== undefined && { startsAt: new Date(input.startsAt) }),
      ...(input.endsAt !== undefined && { endsAt: new Date(input.endsAt) }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.genres !== undefined && { genres: input.genres }),
      ...(input.coverCharge !== undefined && { coverCharge: input.coverCharge }),
      ...(input.slotDuration !== undefined && { slotDuration: input.slotDuration }),
      ...(input.backline !== undefined && { backline: input.backline }),
      ...(input.signUpMethod !== undefined && { signUpMethod: input.signUpMethod }),
      ...(input.isRecurring !== undefined && { isRecurring: input.isRecurring }),
      ...(input.recurringDescription !== undefined && {
        recurringDescription: input.recurringDescription,
      }),
    },
    ...WITH_VENUE,
  });
}

export async function deleteEvent(id: string) {
  return prisma.event.delete({ where: { id } });
}

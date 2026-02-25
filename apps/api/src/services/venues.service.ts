import { prisma } from '../lib/prisma';
import type { VenueInput } from '@on-deck/shared';

/**
 * Find an existing venue by name + city (case-insensitive) or create a new one.
 * If `input.id` is supplied, look that up directly.
 */
export async function findOrCreateVenue(input: VenueInput) {
  if (input.id) {
    return prisma.venue.findUniqueOrThrow({ where: { id: input.id } });
  }

  const existing = await prisma.venue.findFirst({
    where: {
      name: { equals: input.name, mode: 'insensitive' },
      city: { equals: input.city, mode: 'insensitive' },
    },
  });

  if (existing) return existing;

  return prisma.venue.create({
    data: {
      name: input.name,
      address: input.address,
      neighborhood: input.neighborhood ?? null,
      city: input.city,
      state: input.state,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
    },
  });
}

export async function listVenues(city?: string) {
  return prisma.venue.findMany({
    where: city ? { city: { equals: city, mode: 'insensitive' } } : undefined,
    orderBy: { name: 'asc' },
    include: { _count: { select: { events: true } } },
  });
}

export async function getVenue(id: string) {
  return prisma.venue.findUniqueOrThrow({
    where: { id },
    include: {
      events: {
        where: { isApproved: true },
        orderBy: { startsAt: 'asc' },
      },
    },
  });
}

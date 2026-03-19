import { prisma } from '../lib/prisma';
import type { VenueInput } from '@on-deck/shared';

/** Geocode an address string using Nominatim (OpenStreetMap). Returns null if not found. */
async function geocode(address: string, city: string, state: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${address}, ${city}, ${state}`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { 'User-Agent': 'OnDeckApp/1.0 (contact@ondeck.app)' },
    });
    if (!res.ok) return null;
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

/**
 * Find an existing venue by name + city (case-insensitive) or create a new one.
 * If `input.id` is supplied, look that up directly.
 * Automatically geocodes the address when lat/lng are not provided.
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

  if (existing) {
    // Backfill coords if the venue exists but was never geocoded
    if (existing.lat == null && existing.lng == null) {
      const coords = await geocode(input.address, input.city, input.state);
      if (coords) {
        return prisma.venue.update({ where: { id: existing.id }, data: coords });
      }
    }
    return existing;
  }

  const coords = (input.lat != null && input.lng != null)
    ? { lat: input.lat, lng: input.lng }
    : await geocode(input.address, input.city, input.state);

  return prisma.venue.create({
    data: {
      name: input.name,
      address: input.address,
      neighborhood: input.neighborhood ?? null,
      city: input.city,
      state: input.state,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    },
  });
}

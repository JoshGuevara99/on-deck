import type { EventType } from '@on-deck/shared';

export interface MockVenue {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  lat?: number;
  lng?: number;
  instagramHandle?: string;
}

export interface MockEvent {
  id: string;
  title: string;
  type: EventType;
  startsAt: Date;
  endsAt?: Date;
  venue: MockVenue;
  description: string;
  genres: string[];
  isRecurring: boolean;
  recurringDescription?: string;
  backline?: string[];
  coverCharge: string;
  slotDuration?: string;
  signUpMethod: 'door' | 'online' | 'app';
  signupsEnabled: boolean;
  maxSlots: number | null;
  signupCount: number;
  attendeeCount: number;
  hostId: string | null;
  coverImageUrl?: string;
  coverImageThumb?: string;
  coverImagePhotographer?: string;
  coverImagePhotographerUrl?: string;
  coverImageAttribution?: string;
}

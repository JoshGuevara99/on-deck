export type EventType = 'OPEN_MIC' | 'JAM_SESSION';

export interface User {
  id: string; // Clerk user ID
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export interface Event {
  id: string;
  venueId: string;
  hostId: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  type: EventType;
  createdAt: Date;
  updatedAt: Date;
}

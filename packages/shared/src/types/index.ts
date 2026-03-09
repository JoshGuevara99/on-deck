// ─── Enums ────────────────────────────────────────────────────────────────────

export type EventType =
  | 'OPEN_MIC'
  | 'JAM_SESSION'
  | 'COMEDY_NIGHT'
  | 'POETRY_SLAM'
  | 'OPEN_STAGE'
  | 'WORKSHOP'
  | 'OPEN_STUDIO';

export type SignUpMethod = 'DOOR' | 'ONLINE' | 'APP';

export type PerformerType = 'MUSICIAN' | 'COMEDIAN' | 'POET' | 'STORYTELLER' | 'OTHER';

export type SignupStatus = 'SIGNED_UP' | 'PERFORMED' | 'NO_SHOW' | 'REMOVED';

// ─── Core models (API response shapes) ───────────────────────────────────────

export interface User {
  id: string; // Clerk user ID
  email: string;
  name: string | null;
  displayName: string | null;
  bio: string | null;
  performerType: PerformerType | null;
  instruments: string[];
  genres: string[];
  performanceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  neighborhood: string | null;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  instagramHandle: string | null;
}

/** Event as returned by the API — venue is always included inline. */
export interface ApiEvent {
  id: string;
  city: string | null;
  state: string | null;
  title: string;
  description: string | null;
  startsAt: string; // ISO-8601
  endsAt: string | null;
  type: EventType;
  genres: string[];
  coverCharge: string | null;
  slotDuration: string | null;
  backline: string[];
  signUpMethod: SignUpMethod;
  isRecurring: boolean;
  recurringDescription: string | null;
  submittedBy: string | null;
  isApproved: boolean;
  signupsEnabled: boolean;
  maxSlots: number | null;
  hostId: string | null;
  signupCount: number;
  attendeeCount: number;
  venue: Venue;
  createdAt: string;
  updatedAt: string;
}

export interface EventSignup {
  id: string;
  eventId: string;
  userId: string;
  performerType: PerformerType | null;
  instruments: string[];
  genres: string[];
  note: string | null;
  slotOrder: number | null;
  status: SignupStatus;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, 'id' | 'displayName' | 'name'>;
}

// ─── Input shapes ─────────────────────────────────────────────────────────────

export interface VenueInput {
  /** Supply an existing venue ID to reuse it, omit to find-or-create by name+city. */
  id?: string;
  name: string;
  address: string;
  neighborhood?: string;
  city: string;
  state: string;
  lat?: number;
  lng?: number;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  startsAt: string; // ISO-8601
  endsAt?: string;
  type: EventType;
  genres?: string[];
  coverCharge?: string;
  slotDuration?: string;
  backline?: string[];
  signUpMethod?: SignUpMethod;
  isRecurring?: boolean;
  recurringDescription?: string;
  signupsEnabled?: boolean;
  maxSlots?: number;
  venue: VenueInput;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  type?: EventType;
  genres?: string[];
  coverCharge?: string;
  slotDuration?: string;
  backline?: string[];
  signUpMethod?: SignUpMethod;
  isRecurring?: boolean;
  recurringDescription?: string;
  signupsEnabled?: boolean;
  maxSlots?: number;
}

export interface UpdateUserInput {
  displayName?: string;
  bio?: string;
  performerType?: PerformerType | null;
  instruments?: string[];
  genres?: string[];
}

export interface CreateSignupInput {
  performerType?: PerformerType;
  instruments?: string[];
  genres?: string[];
  note?: string;
}

export interface UpdateSignupInput {
  slotOrder?: number;
  status?: SignupStatus;
}

// ─── Query filters ────────────────────────────────────────────────────────────

export interface EventFilters {
  /** Comma-separated list of EventType values */
  type?: string;
  city?: string;
  /** Only events starting today */
  tonight?: boolean;
  /** Only events with no cover charge */
  free?: boolean;
  /** Full-text search across title, description, genres */
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  /** Filter by submitter's Clerk user ID */
  submittedBy?: string;
  /** Filter by hostId */
  hostId?: string;
}

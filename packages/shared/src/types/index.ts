// ─── Enums ────────────────────────────────────────────────────────────────────

export type EventType =
  | 'OPEN_MIC'
  | 'JAM_SESSION'
  | 'COMEDY_NIGHT'
  | 'POETRY_SLAM'
  | 'OPEN_STAGE'
  | 'WORKSHOP'
  | 'OPEN_STUDIO';

export type EventGenre = 'Comedy' | 'Music' | 'Poetry' | 'Jam Session';

export type SignUpMethod = 'DOOR' | 'ONLINE' | 'APP';

export type PerformerType = 'MUSICIAN' | 'COMEDIAN' | 'POET' | 'STORYTELLER' | 'OTHER';

export type SignupStatus = 'SIGNED_UP' | 'PERFORMED' | 'NO_SHOW' | 'REMOVED';

export interface UnsplashPhoto {
  id: string;
  url: string;
  thumb: string;
  downloadLocation: string;
  photographer: string;
  photographerUrl: string;
}

// ─── Core models (API response shapes) ───────────────────────────────────────

export interface User {
  id: string; // Clerk user ID
  email: string;
  name: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  performerType: PerformerType | null;
  instruments: string[];
  genres: string[];
  performanceCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Public-facing user profile — safe to show any signed-in user. */
export interface PublicUser {
  id: string;
  displayName: string | null;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  performerType: PerformerType | null;
  instruments: string[];
  genres: string[];
  performanceCount: number;
  createdAt: string;
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
  signupsEnabled: boolean;
  maxSlots: number | null;
  hostId: string | null;
  sourceUrl: string | null;
  coverImageUrl: string | null;
  coverImageThumb: string | null;
  coverImagePhotographer: string | null;
  coverImagePhotographerUrl: string | null;
  coverImageAttribution: string | null;
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
  instagramHandle: string | null;
  tiktokHandle: string | null;
  slotOrder: number | null;
  status: SignupStatus;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, 'id' | 'displayName' | 'name' | 'avatarUrl'>;
}

/** Public-facing roster entry — safe to show all users. Note omitted. */
export interface PublicSignup {
  id: string;
  slotOrder: number | null;
  status: SignupStatus;
  performerType: PerformerType | null;
  instruments: string[];
  genres: string[];
  instagramHandle: string | null;
  tiktokHandle: string | null;
  createdAt: string;
  user: { id: string; displayName: string | null; name: string | null; avatarUrl: string | null };
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
  coverImageUrl?: string;
  coverImageThumb?: string;
  coverImagePhotographer?: string;
  coverImagePhotographerUrl?: string;
  coverImageAttribution?: string;
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
  avatarUrl?: string | null;
  instagramHandle?: string | null;
  tiktokHandle?: string | null;
  performerType?: PerformerType | null;
  instruments?: string[];
  genres?: string[];
}

export interface CreateSignupInput {
  performerType?: PerformerType;
  instruments?: string[];
  genres?: string[];
  note?: string;
  instagramHandle?: string;
  tiktokHandle?: string;
}

export interface UpdateSignupInput {
  slotOrder?: number;
  status?: SignupStatus;
}

// ─── Query filters ────────────────────────────────────────────────────────────

export interface EventFilters {
  /** Comma-separated list of EventType values */
  type?: string;
  /** Filter by genre: "Comedy", "Music", or "Poetry" */
  genre?: string;
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

import type {
  ApiEvent,
  CreateEventInput,
  EventFilters,
  EventSignup,
  UpdateUserInput,
  CreateSignupInput,
  UpdateSignupInput,
  User,
} from '@on-deck/shared';
import type { MockEvent, MockVenue } from '../constants/mock-data';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function get<T>(path: string, params?: Record<string, string>, token?: string): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    });
  }
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function patch<T>(path: string, body: unknown, token: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function del(path: string, token: string): Promise<void> {
  const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` };
  const res = await fetch(`${API_URL}${path}`, { method: 'DELETE', headers });
  if (!res.ok && res.status !== 204) throw new Error(`DELETE ${path} → ${res.status}`);
}

// ─── Shape conversion ─────────────────────────────────────────────────────────

/** Map the API's ApiEvent into the MockEvent shape the UI components consume. */
function toMockEvent(e: ApiEvent): MockEvent {
  const venue: MockVenue = {
    id: e.venue.id,
    name: e.venue.name,
    address: e.venue.address,
    neighborhood: e.venue.neighborhood ?? e.venue.address,
    city: e.city ?? e.venue.city,
    state: e.state ?? e.venue.state,
    lat: e.venue.lat ?? undefined,
    lng: e.venue.lng ?? undefined,
    instagramHandle: e.venue.instagramHandle || undefined,
  };

  return {
    id: e.id,
    title: e.title,
    type: e.type as MockEvent['type'],
    startsAt: new Date(e.startsAt),
    endsAt: e.endsAt ? new Date(e.endsAt) : undefined,
    venue,
    description: e.description || '',
    genres: e.genres,
    isRecurring: e.isRecurring,
    recurringDescription: e.recurringDescription || undefined,
    backline: e.backline.length > 0 ? e.backline : undefined,
    coverCharge: e.coverCharge || 'Free',
    slotDuration: e.slotDuration || undefined,
    signUpMethod: (e.signUpMethod.toLowerCase() as MockEvent['signUpMethod']),
    signupsEnabled: e.signupsEnabled,
    maxSlots: e.maxSlots,
    signupCount: e.signupCount,
    attendeeCount: e.attendeeCount,
    hostId: e.hostId,
  };
}

// ─── Public API client ────────────────────────────────────────────────────────

export const apiClient = {
  events: {
    async list(filters: EventFilters = {}): Promise<MockEvent[]> {
      const params: Record<string, string> = {};
      if (filters.type) params.type = filters.type;
      if (filters.city) params.city = filters.city;
      if (filters.tonight) params.tonight = 'true';
      if (filters.free) params.free = 'true';
      if (filters.q) params.q = filters.q;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.limit != null) params.limit = String(filters.limit);
      if (filters.offset != null) params.offset = String(filters.offset);
      if (filters.submittedBy) params.submittedBy = filters.submittedBy;

      const data = await get<ApiEvent[]>('/events', params);
      return data.map(toMockEvent);
    },

    async create(input: CreateEventInput, token?: string): Promise<MockEvent> {
      const data = await post<ApiEvent>('/events', input, token);
      return toMockEvent(data);
    },
  },

  signups: {
    async get(eventId: string, token?: string): Promise<{ count: number } | EventSignup[]> {
      return get(`/events/${eventId}/signups`, undefined, token);
    },

    async create(eventId: string, input: CreateSignupInput, token: string): Promise<EventSignup & { slotPosition: number }> {
      return post(`/events/${eventId}/signups`, input, token);
    },

    async cancel(eventId: string, token: string): Promise<void> {
      return del(`/events/${eventId}/signups`, token);
    },

    async update(eventId: string, signupId: string, input: UpdateSignupInput, token: string): Promise<EventSignup> {
      return patch(`/events/${eventId}/signups/${signupId}`, input, token);
    },
  },

  attendees: {
    async rsvp(eventId: string, token: string): Promise<void> {
      await post(`/events/${eventId}/attendees`, {}, token);
    },

    async cancel(eventId: string, token: string): Promise<void> {
      return del(`/events/${eventId}/attendees`, token);
    },
  },

  users: {
    async sync(token: string, body: { email: string; name?: string }): Promise<void> {
      await post<unknown>('/users/sync', body, token);
    },

    async me(token: string): Promise<User> {
      return get<User>('/users/me', undefined, token);
    },

    async update(token: string, input: UpdateUserInput): Promise<User> {
      return patch<User>('/users/me', input, token);
    },

    async myEvents(token: string): Promise<MockEvent[]> {
      const data = await get<ApiEvent[]>('/users/me/events', undefined, token);
      return data.map(toMockEvent);
    },

    async mySignups(token: string): Promise<Array<EventSignup & { event: MockEvent }>> {
      const data = await get<Array<EventSignup & { event: ApiEvent }>>('/users/me/signups', undefined, token);
      return data.map((s) => ({ ...s, event: toMockEvent(s.event) }));
    },

    async myAttending(token: string): Promise<Array<{ id: string; event: MockEvent }>> {
      const data = await get<Array<{ id: string; event: ApiEvent }>>('/users/me/attending', undefined, token);
      return data.map((a) => ({ ...a, event: toMockEvent(a.event) }));
    },
  },
};

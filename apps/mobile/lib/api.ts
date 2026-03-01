import type { ApiEvent, CreateEventInput, EventFilters } from '@on-deck/shared';
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

// ─── Shape conversion ─────────────────────────────────────────────────────────

/** Map the API's ApiEvent into the MockEvent shape the UI components consume. */
function toMockEvent(e: ApiEvent): MockEvent {
  const venue: MockVenue = {
    id: e.venue.id,
    name: e.venue.name,
    address: e.venue.address,
    neighborhood: e.venue.neighborhood ?? e.venue.address,
    city: e.venue.city,
    state: e.venue.state,
  };

  return {
    id: e.id,
    title: e.title,
    type: e.type as MockEvent['type'],
    startsAt: new Date(e.startsAt),
    venue,
    description: e.description ?? '',
    genres: e.genres,
    isRecurring: e.isRecurring,
    recurringDescription: e.recurringDescription ?? undefined,
    backline: e.backline.length > 0 ? e.backline : undefined,
    coverCharge: e.coverCharge ?? 'Free',
    slotDuration: e.slotDuration ?? undefined,
    signUpMethod: (e.signUpMethod.toLowerCase() as MockEvent['signUpMethod']),
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

  users: {
    async sync(token: string, body: { email: string; name?: string }): Promise<void> {
      await post<unknown>('/users/sync', body, token);
    },

    async myEvents(token: string): Promise<MockEvent[]> {
      const data = await get<ApiEvent[]>('/users/me/events', undefined, token);
      return data.map(toMockEvent);
    },
  },
};

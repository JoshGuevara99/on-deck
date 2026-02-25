import React, { createContext, useContext, useEffect, useState } from 'react';
import { MOCK_EVENTS, type MockEvent } from '../constants/mock-data';
import { apiClient } from '../lib/api';
import type { CreateEventInput } from '@on-deck/shared';

interface EventsContextValue {
  events: MockEvent[];
  loading: boolean;
  error: string | null;
  addEvent: (input: CreateEventInput) => Promise<MockEvent>;
  refresh: () => Promise<void>;
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<MockEvent[]>(MOCK_EVENTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchEvents() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.events.list();
      setEvents(data);
    } catch (e) {
      // API unreachable — keep mock data so the UI still works offline
      console.warn('API unavailable, using mock data:', e);
      setError('Could not reach the server. Showing cached data.');
      setEvents(MOCK_EVENTS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchEvents(); }, []);

  async function addEvent(input: CreateEventInput): Promise<MockEvent> {
    const newEvent = await apiClient.events.create(input);
    setEvents((prev) => [newEvent, ...prev]);
    return newEvent;
  }

  return (
    <EventsContext.Provider value={{ events, loading, error, addEvent, refresh: fetchEvents }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents(): EventsContextValue {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useEvents must be used inside <EventsProvider>');
  return ctx;
}

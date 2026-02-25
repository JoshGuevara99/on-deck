import React, { createContext, useContext, useState } from 'react';
import { MOCK_EVENTS, type MockEvent } from '../constants/mock-data';

interface EventsContextValue {
  events: MockEvent[];
  addEvent: (event: MockEvent) => void;
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<MockEvent[]>(MOCK_EVENTS);

  function addEvent(event: MockEvent) {
    setEvents((prev) => [event, ...prev]);
  }

  return (
    <EventsContext.Provider value={{ events, addEvent }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents(): EventsContextValue {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useEvents must be used inside <EventsProvider>');
  return ctx;
}

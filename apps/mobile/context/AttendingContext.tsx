import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { apiClient } from '../lib/api';
import type { MockEvent } from '../constants/mock-data';

interface AttendingContextValue {
  /** Set of event IDs the signed-in user is attending — fast O(1) lookup. */
  attendingIds: Set<string>;
  /** Full attending records — used by the profile "My Events" section. */
  attending: Array<{ id: string; event: MockEvent }>;
  addAttending: (event: MockEvent) => void;
  removeAttending: (eventId: string) => void;
}

const AttendingContext = createContext<AttendingContextValue | null>(null);

export function AttendingProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, getToken } = useAuth();
  const [attending, setAttending] = useState<Array<{ id: string; event: MockEvent }>>([]);

  useEffect(() => {
    if (!isSignedIn) {
      setAttending([]);
      return;
    }
    // getToken intentionally excluded from deps — it changes reference every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    getToken().then((token) => {
      if (!token) return;
      apiClient.users.myAttending(token).then(setAttending).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  const attendingIds = useMemo(
    () => new Set(attending.map((a) => a.event.id)),
    [attending]
  );

  function addAttending(event: MockEvent) {
    setAttending((prev) =>
      prev.some((a) => a.event.id === event.id)
        ? prev
        : [...prev, { id: `local-${event.id}`, event }]
    );
  }

  function removeAttending(eventId: string) {
    setAttending((prev) => prev.filter((a) => a.event.id !== eventId));
  }

  return (
    <AttendingContext.Provider value={{ attendingIds, attending, addAttending, removeAttending }}>
      {children}
    </AttendingContext.Provider>
  );
}

export function useAttending(): AttendingContextValue {
  const ctx = useContext(AttendingContext);
  if (!ctx) throw new Error('useAttending must be used inside <AttendingProvider>');
  return ctx;
}

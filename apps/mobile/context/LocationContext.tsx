import React, { createContext, useContext, useState } from 'react';
import { DEFAULT_CITY, type CityOption } from '../constants/cities';

interface LocationContextValue {
  selectedCity: CityOption | null; // null = all cities
  setCity: (city: CityOption | null) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(DEFAULT_CITY);

  return (
    <LocationContext.Provider value={{ selectedCity, setCity: setSelectedCity }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used inside <LocationProvider>');
  return ctx;
}

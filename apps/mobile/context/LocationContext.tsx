import React, { createContext, useContext, useState, useEffect } from 'react';
import { PRESET_CITIES, DEFAULT_CITY, type CityOption } from '../constants/cities';

interface LocationContextValue {
  selectedCity: CityOption | null;
  setCity: (city: CityOption | null) => void;
  /** true = granted, false = denied/unavailable, null = not yet asked */
  locationPermission: boolean | null;
  /** Raw device coords — used for the blue dot on the map */
  deviceCoords: { lat: number; lng: number } | null;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(DEFAULT_CITY);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function requestLocation() {
      // Dynamic import so a missing native module fails here (catchable)
      // rather than crashing the whole module at parse time.
      let Location: typeof import('expo-location');
      try {
        Location = await import('expo-location');
      } catch {
        if (!cancelled) setLocationPermission(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      if (status !== 'granted') {
        setLocationPermission(false);
        return;
      }

      setLocationPermission(true);

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (cancelled) return;

      const { latitude, longitude } = position.coords;
      setDeviceCoords({ lat: latitude, lng: longitude });

      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (cancelled || !results[0]) return;

      const detectedCity = results[0].city ?? results[0].subregion ?? results[0].region;
      if (!detectedCity) return;

      const preset = PRESET_CITIES.find(
        (c) => c.city.toLowerCase() === detectedCity.toLowerCase()
      );

      if (preset) {
        setSelectedCity(preset);
      } else {
        setSelectedCity({
          city: detectedCity,
          label: [detectedCity, results[0].region].filter(Boolean).join(', '),
          lat: latitude,
          lng: longitude,
        });
      }
    }

    requestLocation().catch(() => {
      if (!cancelled) setLocationPermission(false);
    });

    return () => { cancelled = true; };
  }, []);

  return (
    <LocationContext.Provider value={{ selectedCity, setCity: setSelectedCity, locationPermission, deviceCoords }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used inside <LocationProvider>');
  return ctx;
}

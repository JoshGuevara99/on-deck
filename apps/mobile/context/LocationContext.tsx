import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { PRESET_CITIES, DEFAULT_CITY, type CityOption } from '../constants/cities';

interface LocationContextValue {
  selectedCity: CityOption | null;
  setCity: (city: CityOption | null) => void;
  /** true = granted, false = denied, null = not yet asked */
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
      let status: string;
      try {
        const result = await Location.requestForegroundPermissionsAsync();
        status = result.status;
      } catch {
        // Native module not available (dev client not rebuilt yet) — degrade gracefully
        setLocationPermission(false);
        return;
      }

      if (cancelled) return;

      if (status !== 'granted') {
        setLocationPermission(false);
        return;
      }

      setLocationPermission(true);

      let position: Location.LocationObject;
      try {
        position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch {
        return;
      }

      if (cancelled) return;

      const { latitude, longitude } = position.coords;
      setDeviceCoords({ lat: latitude, lng: longitude });

      // Reverse-geocode to find the city name
      let results: Location.LocationGeocodedAddress[];
      try {
        results = await Location.reverseGeocodeAsync({ latitude, longitude });
      } catch {
        return;
      }

      if (cancelled || !results[0]) return;

      const detectedCity = results[0].city ?? results[0].subregion ?? results[0].region;
      if (!detectedCity) return;

      // Try to match against a preset city (case-insensitive)
      const preset = PRESET_CITIES.find(
        (c) => c.city.toLowerCase() === detectedCity.toLowerCase()
      );

      if (preset) {
        setSelectedCity(preset);
      } else {
        // Not in our preset list — create a custom entry centred on device coords
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

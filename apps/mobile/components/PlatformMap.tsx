import { lazy, Suspense, useState, useEffect } from 'react';
import { View } from 'react-native';
import type { CityOption } from '../constants/cities';

export interface VenueMarkerEvent {
  id: string;
  title: string;
  startsAt: Date;
  type: string;
}

export interface VenueMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  events: VenueMarkerEvent[];
}

interface Props {
  venues: VenueMarker[];
  selectedCity: CityOption | null;
  locationGranted: boolean;
  deviceCoords: { lat: number; lng: number } | null;
}

// GoogleMapView uses browser APIs so it must never be loaded during SSR/static-gen.
// React.lazy + a mount guard ensures the import only fires in the browser.
const GoogleMapView = lazy(() => import('./GoogleMapView'));

export default function PlatformMap({ venues, selectedCity }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <View style={{ flex: 1 }} />;

  return (
    <Suspense fallback={<View style={{ flex: 1 }} />}>
      <GoogleMapView venues={venues} selectedCity={selectedCity} />
    </Suspense>
  );
}

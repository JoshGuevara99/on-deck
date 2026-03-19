import { lazy, Suspense, useState, useEffect } from 'react';
import { View } from 'react-native';
import type { CityOption } from '../constants/cities';

export interface VenueMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  eventTitles: string[];
}

interface Props {
  venues: VenueMarker[];
  selectedCity: CityOption | null;
  locationGranted: boolean;
  deviceCoords: { lat: number; lng: number } | null;
}

// LeafletMap accesses `window` at import time, so it must never be loaded
// during Expo Router's SSR/static-generation pass (Node.js has no `window`).
// React.lazy + a mount guard ensures the import only fires in the browser.
const LeafletMap = lazy(() => import('./LeafletMap'));

export default function PlatformMap({ venues, selectedCity }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <View style={{ flex: 1 }} />;

  return (
    <Suspense fallback={<View style={{ flex: 1 }} />}>
      <LeafletMap venues={venues} selectedCity={selectedCity} />
    </Suspense>
  );
}

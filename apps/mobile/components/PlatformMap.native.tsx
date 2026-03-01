import { useRef, useEffect } from 'react';
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet } from 'react-native';
import { DEFAULT_CITY } from '../constants/cities';
import type { VenueMarker } from './PlatformMap';
import type { CityOption } from '../constants/cities';

interface Props {
  venues: VenueMarker[];
  selectedCity: CityOption | null;
}

export default function PlatformMap({ venues, selectedCity }: Props) {
  const mapRef = useRef<MapView>(null);
  const center = selectedCity ?? DEFAULT_CITY;

  useEffect(() => {
    if (center.lat == null || center.lng == null) return;
    mapRef.current?.animateToRegion(
      {
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      },
      600,
    );
  }, [center.lat, center.lng]);

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={{
        latitude: center.lat ?? DEFAULT_CITY.lat!,
        longitude: center.lng ?? DEFAULT_CITY.lng!,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }}
    >
      {venues.map((venue) => (
        <Marker
          key={venue.id}
          coordinate={{ latitude: venue.lat, longitude: venue.lng }}
          title={venue.name}
          description={
            venue.eventTitles.length === 1
              ? venue.eventTitles[0]
              : `${venue.eventTitles.length} events`
          }
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});

import { useRef, useEffect } from 'react';
import MapView, { Marker, Callout } from 'react-native-maps';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { DEFAULT_CITY } from '../constants/cities';
import type { VenueMarker } from './PlatformMap';
import type { CityOption } from '../constants/cities';

const EVENT_TYPE_LABELS: Record<string, string> = {
  OPEN_MIC: 'Open Mic',
  JAM_SESSION: 'Jam Session',
  COMEDY_NIGHT: 'Comedy Night',
  POETRY_SLAM: 'Poetry Slam',
  OPEN_STAGE: 'Open Stage',
  WORKSHOP: 'Workshop',
  OPEN_STUDIO: 'Open Studio',
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface Props {
  venues: VenueMarker[];
  selectedCity: CityOption | null;
  locationGranted: boolean;
  deviceCoords: { lat: number; lng: number } | null;
}

export default function PlatformMap({ venues, selectedCity, locationGranted, deviceCoords }: Props) {
  const mapRef = useRef<MapView>(null);
  const router = useRouter();

  const center = selectedCity ?? (deviceCoords ? { lat: deviceCoords.lat, lng: deviceCoords.lng } : DEFAULT_CITY);

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
      showsUserLocation={locationGranted}
      showsMyLocationButton={locationGranted}
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
        >
          <Callout tooltip>
            <View style={styles.callout}>
              <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
              <ScrollView style={styles.eventList} showsVerticalScrollIndicator={false}>
                {venue.events.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventRow}
                    onPress={() => router.push(`/events/${event.id}`)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.eventTime}>{formatTime(event.startsAt)}</Text>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                      <Text style={styles.eventType}>{EVENT_TYPE_LABELS[event.type] ?? event.type}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.calloutArrow} />
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  callout: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    minWidth: 200,
    maxWidth: 260,
    maxHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  venueName: {
    color: '#d4a017',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  eventList: {
    maxHeight: 150,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  eventTime: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '600',
    minWidth: 52,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  eventType: {
    color: '#888',
    fontSize: 10,
    marginTop: 1,
  },
  calloutArrow: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1a1a1a',
  },
});

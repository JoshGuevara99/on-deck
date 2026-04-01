import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useEvents } from '../../context/EventsContext';
import { useLocation } from '../../context/LocationContext';
import { CityPickerModal } from '../../components/CityPickerModal';
import PlatformMap from '../../components/PlatformMap';
import type { VenueMarker, VenueMarkerEvent } from '../../components/PlatformMap';

type TimeFilter = 'all' | 'today' | 'tomorrow' | 'week';

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'today',    label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week',     label: 'This Week' },
];

function getFilterRange(filter: TimeFilter): { start: Date; end: Date } | null {
  if (filter === 'all') return null;
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (filter === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (filter === 'tomorrow') {
    start.setDate(now.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(now.getDate() + 1);
    end.setHours(23, 59, 59, 999);
  } else if (filter === 'week') {
    start.setHours(0, 0, 0, 0);
    end.setDate(now.getDate() + 7);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

export default function MapScreen() {
  const { colors } = useTheme();
  const { events } = useEvents();
  const { selectedCity, setCity, locationPermission, deviceCoords } = useLocation();
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const venues = useMemo<VenueMarker[]>(() => {
    const range = getFilterRange(timeFilter);
    const map = new Map<string, VenueMarker>();
    for (const event of events) {
      if (!event.venue.lat || !event.venue.lng) continue;
      if (range) {
        const t = event.startsAt.getTime();
        if (t < range.start.getTime() || t > range.end.getTime()) continue;
      }
      if (!map.has(event.venue.id)) {
        map.set(event.venue.id, {
          id: event.venue.id,
          name: event.venue.name,
          lat: event.venue.lat,
          lng: event.venue.lng,
          events: [],
        });
      }
      const venueEntry = map.get(event.venue.id)!;
      const markerEvent: VenueMarkerEvent = {
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        type: event.type,
      };
      venueEntry.events.push(markerEvent);
    }
    return [...map.values()];
  }, [events, timeFilter]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Nearby</Text>
          <TouchableOpacity
            style={styles.locationRow}
            onPress={() => setShowCityPicker(true)}
            activeOpacity={0.7}
            accessibilityLabel="Change city"
          >
            <Ionicons name="location-sharp" size={12} color={colors.gold} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {selectedCity ? selectedCity.label : 'All Cities'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="location" size={13} color={colors.gold} />
          <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
            {venues.reduce((n, v) => n + v.events.length, 0)}{' '}
            {venues.reduce((n, v) => n + v.events.length, 0) === 1 ? 'event' : 'events'}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {TIME_FILTERS.map(({ key, label }) => {
          const active = timeFilter === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setTimeFilter(key)}
              activeOpacity={0.75}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active ? colors.gold : colors.surface,
                  borderColor: active ? colors.gold : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: active ? '#000' : colors.textSecondary },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <PlatformMap
        venues={venues}
        selectedCity={selectedCity}
        locationGranted={locationPermission === true}
        deviceCoords={deviceCoords}
      />

      <CityPickerModal
        visible={showCityPicker}
        selectedCity={selectedCity}
        onSelect={setCity}
        onClose={() => setShowCityPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

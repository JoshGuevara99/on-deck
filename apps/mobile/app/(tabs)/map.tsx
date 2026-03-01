import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useEvents } from '../../context/EventsContext';
import { useLocation } from '../../context/LocationContext';
import { CityPickerModal } from '../../components/CityPickerModal';
import PlatformMap from '../../components/PlatformMap';
import type { VenueMarker } from '../../components/PlatformMap';

export default function MapScreen() {
  const { colors, theme } = useTheme();
  const { events } = useEvents();
  const { selectedCity, setCity } = useLocation();
  const [showCityPicker, setShowCityPicker] = useState(false);

  const venues = useMemo<VenueMarker[]>(() => {
    const map = new Map<string, VenueMarker>();
    for (const event of events) {
      if (!event.venue.lat || !event.venue.lng) continue;
      if (!map.has(event.venue.id)) {
        map.set(event.venue.id, {
          id: event.venue.id,
          name: event.venue.name,
          lat: event.venue.lat,
          lng: event.venue.lng,
          eventTitles: [],
        });
      }
      map.get(event.venue.id)!.eventTitles.push(event.title);
    }
    return [...map.values()];
  }, [events]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
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
            {venues.length} {venues.length === 1 ? 'venue' : 'venues'}
          </Text>
        </View>
      </View>

      <PlatformMap venues={venues} selectedCity={selectedCity} />

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
});

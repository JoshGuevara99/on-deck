import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { MOCK_EVENTS } from '../../constants/mock-data';
import { EventCard } from '../../components/EventCard';
import { FilterChip } from '../../components/FilterChip';
import { SectionHeader } from '../../components/SectionHeader';
import { isTonight } from '../../utils/date';
import type { EventType } from '@on-deck/shared';

type Filter = 'all' | EventType;

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open Mic', value: 'OPEN_MIC' },
  { label: 'Jam Session', value: 'JAM_SESSION' },
];

export default function DiscoverScreen() {
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const filtered = useMemo(
    () => MOCK_EVENTS.filter((e) => activeFilter === 'all' || e.type === activeFilter),
    [activeFilter],
  );

  const tonight = useMemo(() => filtered.filter((e) => isTonight(e.startsAt)), [filtered]);
  const upcoming = useMemo(() => filtered.filter((e) => !isTonight(e.startsAt)), [filtered]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>ON DECK</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={12} color={COLORS.gold} />
              <Text style={styles.locationText}>Austin, TX</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Ionicons name="options-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* ── Search ─────────────────────────────────────── */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, venues, genres…"
            placeholderTextColor={COLORS.textMuted}
            editable={false}
          />
        </View>

        {/* ── Filter chips ───────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              label={f.label}
              active={activeFilter === f.value}
              onPress={() => setActiveFilter(f.value)}
            />
          ))}
        </ScrollView>

        {/* ── Tonight ────────────────────────────────────── */}
        {tonight.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Tonight" subtitle={`${tonight.length} events`} />
            {tonight.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </View>
        )}

        {/* ── Coming up ──────────────────────────────────── */}
        {upcoming.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Coming Up" subtitle={`${upcoming.length} events`} />
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </View>
        )}

        {/* ── Empty state ────────────────────────────────── */}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes-outline" size={52} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Nothing on deck</Text>
            <Text style={styles.emptySub}>Try a different filter or check back soon.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  scrollContentWide: {
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 20,
    paddingBottom: 14,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
    color: COLORS.gold,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  filterScroll: {
    marginBottom: 24,
  },
  filterContent: {
    paddingRight: 16,
  },
  section: {
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  emptySub: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

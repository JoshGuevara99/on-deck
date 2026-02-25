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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { MOCK_EVENTS } from '../../constants/mock-data';
import { EventCard } from '../../components/EventCard';
import { FilterChip } from '../../components/FilterChip';
import { FilterModal, type ExtraFilters } from '../../components/FilterModal';
import { SectionHeader } from '../../components/SectionHeader';
import { isTonight } from '../../utils/date';
import type { EventType } from '@on-deck/shared';

type Filter = 'all' | EventType;

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open Mic', value: 'OPEN_MIC' },
  { label: 'Jam Session', value: 'JAM_SESSION' },
];

const INITIAL_EXTRA_FILTERS: ExtraFilters = { tonightOnly: false, freeOnly: false };

export default function DiscoverScreen() {
  const { colors, theme } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [extraFilters, setExtraFilters] = useState<ExtraFilters>(INITIAL_EXTRA_FILTERS);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const activeExtraCount = Object.values(extraFilters).filter(Boolean).length;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MOCK_EVENTS.filter((e) => {
      if (activeFilter !== 'all' && e.type !== activeFilter) return false;
      if (extraFilters.tonightOnly && !isTonight(e.startsAt)) return false;
      if (extraFilters.freeOnly && e.coverCharge !== 'Free') return false;
      if (q) {
        const haystack = [
          e.title,
          e.venue.name,
          e.venue.neighborhood,
          ...e.genres,
          e.description,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [activeFilter, searchQuery, extraFilters]);

  const tonight = useMemo(() => filtered.filter((e) => isTonight(e.startsAt)), [filtered]);
  const upcoming = useMemo(() => filtered.filter((e) => !isTonight(e.startsAt)), [filtered]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>ON DECK</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={12} color={colors.gold} />
              <Text style={styles.locationText}>Austin, TX</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.iconButton, activeExtraCount > 0 && styles.iconButtonActive]}
            activeOpacity={0.7}
            onPress={() => setShowFilterModal(true)}
            accessibilityLabel={`Filter options${activeExtraCount > 0 ? `, ${activeExtraCount} active` : ''}`}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeExtraCount > 0 ? colors.gold : colors.text}
            />
            {activeExtraCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeExtraCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Search ─────────────────────────────────────── */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, venues, genres…"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Search events"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
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
            <Ionicons name="musical-notes-outline" size={52} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nothing on deck</Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? `No results for "${searchQuery}"`
                : 'Try a different filter or check back soon.'}
            </Text>
            {(searchQuery || activeExtraCount > 0) && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setExtraFilters(INITIAL_EXTRA_FILTERS);
                  setActiveFilter('all');
                }}
                style={styles.clearAllBtn}
                accessibilityLabel="Clear all filters"
              >
                <Text style={styles.clearAllText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <FilterModal
        visible={showFilterModal}
        filters={extraFilters}
        onChange={setExtraFilters}
        onClose={() => setShowFilterModal(false)}
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.bg,
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
      color: colors.gold,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 3,
    },
    locationText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    iconButtonActive: {
      borderColor: colors.gold,
      backgroundColor: `${colors.gold}18`,
    },
    filterBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.bg,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
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
      color: colors.textSecondary,
    },
    emptySub: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
    },
    clearAllBtn: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 4,
    },
    clearAllText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });
}

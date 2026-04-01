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
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useEvents } from '../../context/EventsContext';
import { useLocation } from '../../context/LocationContext';
import { EventCard } from '../../components/EventCard';
import { FilterChip } from '../../components/FilterChip';
import { CityPickerModal } from '../../components/CityPickerModal';
import { CalendarModal } from '../../components/CalendarModal';
import { SectionHeader } from '../../components/SectionHeader';
import {
  isSameDay,
  isToday,
  isTomorrow,
  startOfDay,
  endOfWeek,
  endOfMonth,
  formatSectionHeader,
} from '../../utils/date';
import type { EventType, EventGenre } from '@on-deck/shared';
import type { MockEvent } from '../../constants/mock-data';

// ─── Types ────────────────────────────────────────────────────────────────────

type EventTypeFilter = 'all' | EventType;

type FilterChipDef =
  | { kind: 'all';   label: string }
  | { kind: 'type';  label: string; value: EventType }
  | { kind: 'genre'; label: string; value: EventGenre };

type DateFilter =
  | { type: 'all' }
  | { type: 'today' }
  | { type: 'tomorrow' }
  | { type: 'week' }
  | { type: 'month' }
  | { type: 'date'; date: Date };

const DATE_CHIPS: { label: string; value: DateFilter }[] = [
  { label: 'All',        value: { type: 'all' } },
  { label: 'Tonight',    value: { type: 'today' } },
  { label: 'Tomorrow',   value: { type: 'tomorrow' } },
  { label: 'This Week',  value: { type: 'week' } },
  { label: 'This Month', value: { type: 'month' } },
];

const EVENT_FILTERS: FilterChipDef[] = [
  { kind: 'all',   label: 'All' },
  { kind: 'type',  label: 'Open Mic',    value: 'OPEN_MIC' },
  { kind: 'genre', label: 'Music',       value: 'Music' },
  { kind: 'genre', label: 'Comedy',      value: 'Comedy' },
  { kind: 'genre', label: 'Poetry',      value: 'Poetry' },
  { kind: 'genre', label: 'Jam Session', value: 'Jam Session' },
  { kind: 'type',  label: 'Workshop',    value: 'WORKSHOP' },
  { kind: 'type',  label: 'Open Studio', value: 'OPEN_STUDIO' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyDateFilter(events: MockEvent[], filter: DateFilter): MockEvent[] {
  const now = new Date();
  switch (filter.type) {
    case 'today':
      return events.filter((e) => isToday(e.startsAt));
    case 'tomorrow':
      return events.filter((e) => isTomorrow(e.startsAt));
    case 'week':
      return events.filter((e) => e.startsAt <= endOfWeek(now));
    case 'month':
      return events.filter((e) => e.startsAt <= endOfMonth(now));
    case 'date':
      return events.filter((e) => isSameDay(e.startsAt, filter.date));
    default:
      return events.filter((e) => e.startsAt >= startOfDay(now));
  }
}

/** Group events by calendar day, sorted ascending. */
function groupByDay(events: MockEvent[]): { date: Date; events: MockEvent[] }[] {
  const map = new Map<string, { date: Date; events: MockEvent[] }>();
  for (const e of events) {
    const key = startOfDay(e.startsAt).getTime().toString();
    if (!map.has(key)) map.set(key, { date: startOfDay(e.startsAt), events: [] });
    map.get(key)!.events.push(e);
  }
  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function dateFilterLabel(filter: DateFilter): string | null {
  if (filter.type === 'date') {
    return filter.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return null;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const { colors, theme } = useTheme();
  const { events, loading, error } = useEvents();
  const { selectedCity, setCity } = useLocation();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [activeFilter, setActiveFilter] = useState<FilterChipDef>(EVENT_FILTERS[0]!);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = events.filter((e) => {
      if (activeFilter.kind === 'type' && e.type !== activeFilter.value) return false;
      if (activeFilter.kind === 'genre' && !e.genres.includes(activeFilter.value)) return false;
      if (q) {
        const haystack = [e.title, e.venue.name, e.venue.neighborhood, ...e.genres, e.description]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return applyDateFilter(result, dateFilter);
  }, [events, activeFilter, searchQuery, dateFilter]);

  // ── Grouping ───────────────────────────────────────────────────────────────

  // Single-day view: show flat list, no per-day headers needed (one header at top)
  const isSingleDay = dateFilter.type === 'today' ||
    dateFilter.type === 'tomorrow' ||
    dateFilter.type === 'date';

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  // ── Calendar active state ──────────────────────────────────────────────────

  const calendarActive = dateFilter.type === 'date';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      )}

      {!loading && error && (
        <View style={[styles.errorBanner, { backgroundColor: `${colors.jam}18`, borderColor: colors.jam }]}>
          <Ionicons name="cloud-offline-outline" size={14} color={colors.jam} />
          <Text style={[styles.errorBannerText, { color: colors.jam }]}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>ON DECK</Text>
            <TouchableOpacity
              style={styles.locationRow}
              onPress={() => setShowCityPicker(true)}
              activeOpacity={0.7}
              accessibilityLabel="Change city"
            >
              <Ionicons name="location-sharp" size={12} color={colors.gold} />
              <Text style={styles.locationText}>
                {selectedCity ? selectedCity.label : 'All Cities'}
              </Text>
              <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerActions}>
            {/* Calendar button */}
            <TouchableOpacity
              style={[styles.iconButton, calendarActive && styles.iconButtonActive]}
              onPress={() => setShowCalendar(true)}
              accessibilityLabel="Open calendar"
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={calendarActive ? colors.gold : colors.text}
              />
              {calendarActive && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>
                    {(dateFilter as { date: Date }).date.getDate()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

          </View>
        </View>

        {/* ── Search ──────────────────────────────────────────── */}
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
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Date filter chips ────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {DATE_CHIPS.map((chip) => {
            const active =
              calendarActive
                ? false
                : dateFilter.type === chip.value.type;
            return (
              <FilterChip
                key={chip.label}
                label={chip.label}
                active={active}
                onPress={() => {
                  setDateFilter(chip.value);
                }}
              />
            );
          })}

          {/* Show selected calendar date as a chip */}
          {calendarActive && (
            <FilterChip
              label={`📅 ${dateFilterLabel(dateFilter)}`}
              active
              onPress={() => setDateFilter({ type: 'all' })}
            />
          )}
        </ScrollView>

        {/* ── Event type chips ─────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {EVENT_FILTERS.map((f) => {
            const isActive = f.kind === 'all'
              ? activeFilter.kind === 'all'
              : f.kind === activeFilter.kind && f.value === (activeFilter as any).value;
            return (
              <FilterChip
                key={f.label}
                label={f.label}
                active={isActive}
                onPress={() => setActiveFilter(f)}
              />
            );
          })}
        </ScrollView>

        {/* ── Events ──────────────────────────────────────────── */}
        {grouped.length > 0 ? (
          grouped.map(({ date, events: dayEvents }) => (
            <View key={date.getTime()} style={styles.section}>
              {!isSingleDay && (
                <SectionHeader
                  title={formatSectionHeader(date)}
                  subtitle={`${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`}
                />
              )}
              {isSingleDay && grouped.length === 1 && (
                <SectionHeader
                  title={formatSectionHeader(date)}
                  subtitle={`${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`}
                />
              )}
              {dayEvents.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                />
              ))}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={52} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nothing on deck</Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? `No results for "${searchQuery}"`
                : 'Try a different date or filter.'}
            </Text>
            {(searchQuery || dateFilter.type !== 'all' || activeFilter.kind !== 'all') && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setDateFilter({ type: 'all' });
                  setActiveFilter(EVENT_FILTERS[0]!);
                }}
                style={styles.clearAllBtn}
              >
                <Text style={styles.clearAllText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <CityPickerModal
        visible={showCityPicker}
        selectedCity={selectedCity}
        onSelect={setCity}
        onClose={() => setShowCityPicker(false)}
      />
      <CalendarModal
        visible={showCalendar}
        events={events}
        selectedDate={dateFilter.type === 'date' ? dateFilter.date : null}
        onSelectDate={(date) => setDateFilter({ type: 'date', date })}
        onClose={() => setShowCalendar(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
    scrollContentWide: { maxWidth: 700, alignSelf: 'center', width: '100%' },
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
    headerActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
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
    },
    iconButtonActive: {
      borderColor: colors.gold,
      backgroundColor: `${colors.gold}18`,
    },
    filterBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    filterBadgeText: {
      fontSize: 9,
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
      marginBottom: 12,
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.text },
    filterScroll: { marginBottom: 12 },
    filterContent: { paddingRight: 16 },
    section: { marginBottom: 8 },
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
    loadingOverlay: {
      position: 'absolute',
      top: 80,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 10,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginHorizontal: 16,
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
    },
    errorBannerText: { fontSize: 12, fontWeight: '500', flex: 1 },
  });
}

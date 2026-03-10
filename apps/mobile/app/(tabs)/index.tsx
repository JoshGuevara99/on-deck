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
import { FilterModal, type ExtraFilters } from '../../components/FilterModal';
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
import type { EventType } from '@on-deck/shared';
import type { MockEvent } from '../../constants/mock-data';

// ─── Types ────────────────────────────────────────────────────────────────────

type EventTypeFilter = 'all' | EventType;

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

const TYPE_FILTERS: { label: string; value: EventTypeFilter }[] = [
  { label: 'All',         value: 'all' },
  { label: 'Open Mic',    value: 'OPEN_MIC' },
  { label: 'Jam Session', value: 'JAM_SESSION' },
  { label: 'Comedy',      value: 'COMEDY_NIGHT' },
  { label: 'Poetry',      value: 'POETRY_SLAM' },
  { label: 'Workshop',    value: 'WORKSHOP' },
  { label: 'Open Studio', value: 'OPEN_STUDIO' },
];

const INITIAL_EXTRA_FILTERS: ExtraFilters = { tonightOnly: false, freeOnly: false };

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
      return events;
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

  const [typeFilter, setTypeFilter] = useState<EventTypeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [extraFilters, setExtraFilters] = useState<ExtraFilters>(INITIAL_EXTRA_FILTERS);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const styles = useMemo(() => makeStyles(colors), [colors]);
  const activeExtraCount = Object.values(extraFilters).filter(Boolean).length;

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = events.filter((e) => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (extraFilters.freeOnly && e.coverCharge !== 'Free') return false;
      if (q) {
        const haystack = [e.title, e.venue.name, e.venue.neighborhood, ...e.genres, e.description]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    // tonightOnly from extra filters overrides dateFilter
    if (extraFilters.tonightOnly) {
      result = result.filter((e) => isToday(e.startsAt));
    } else {
      result = applyDateFilter(result, dateFilter);
    }

    return result;
  }, [events, typeFilter, searchQuery, extraFilters, dateFilter]);

  // ── Grouping ───────────────────────────────────────────────────────────────

  // Single-day view: show flat list, no per-day headers needed (one header at top)
  const isSingleDay = dateFilter.type === 'today' ||
    dateFilter.type === 'tomorrow' ||
    dateFilter.type === 'date' ||
    extraFilters.tonightOnly;

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

            {/* Extra filters button */}
            <TouchableOpacity
              style={[styles.iconButton, activeExtraCount > 0 && styles.iconButtonActive]}
              onPress={() => setShowFilterModal(true)}
              accessibilityLabel="Filter options"
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
                  setExtraFilters((f) => ({ ...f, tonightOnly: false }));
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
          {TYPE_FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              label={f.label}
              active={typeFilter === f.value}
              onPress={() => setTypeFilter(f.value)}
            />
          ))}
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
                  expanded={expandedId === e.id}
                  onPress={() => toggleExpand(e.id)}
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
            {(searchQuery || dateFilter.type !== 'all' || typeFilter !== 'all' || activeExtraCount > 0) && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setDateFilter({ type: 'all' });
                  setTypeFilter('all');
                  setExtraFilters(INITIAL_EXTRA_FILTERS);
                }}
                style={styles.clearAllBtn}
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
    scrollContent: { paddingHorizontal: 18, paddingBottom: 110 },
    scrollContentWide: { maxWidth: 720, alignSelf: 'center', width: '100%' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 24,
      paddingBottom: 20,
    },
    appName: {
      fontSize: 36,
      fontWeight: '900',
      letterSpacing: 6,
      color: colors.text,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignSelf: 'flex-start',
    },
    locationText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButtonActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}18`,
    },
    filterBadge: {
      position: 'absolute',
      top: -5,
      right: -5,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    filterBadgeText: {
      fontSize: 9,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      marginBottom: 14,
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
    filterScroll: { marginBottom: 14 },
    filterContent: { paddingRight: 18 },
    section: { marginBottom: 8 },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      gap: 14,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '900',
      letterSpacing: -0.5,
      color: colors.textSecondary,
    },
    emptySub: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 22,
    },
    clearAllBtn: {
      paddingHorizontal: 22,
      paddingVertical: 11,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: colors.accent,
      marginTop: 4,
    },
    clearAllText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accent,
      letterSpacing: 0.3,
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
      marginHorizontal: 18,
      marginTop: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    errorBannerText: { fontSize: 12, fontWeight: '600', flex: 1 },
  });
}

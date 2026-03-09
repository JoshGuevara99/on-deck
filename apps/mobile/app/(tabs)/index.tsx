import { useState, useMemo, useRef } from 'react';
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
  Animated,
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
  { label: 'All',      value: 'all' },
  { label: 'Open Mic', value: 'OPEN_MIC' },
  { label: 'Jam',      value: 'JAM_SESSION' },
  { label: 'Comedy',   value: 'COMEDY_NIGHT' },
  { label: 'Poetry',   value: 'POETRY_SLAM' },
  { label: 'Workshop', value: 'WORKSHOP' },
  { label: 'Studio',   value: 'OPEN_STUDIO' },
];

const INITIAL_EXTRA: ExtraFilters = { tonightOnly: false, freeOnly: false };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyDateFilter(events: MockEvent[], filter: DateFilter): MockEvent[] {
  const now = new Date();
  switch (filter.type) {
    case 'today':    return events.filter((e) => isToday(e.startsAt));
    case 'tomorrow': return events.filter((e) => isTomorrow(e.startsAt));
    case 'week':     return events.filter((e) => e.startsAt <= endOfWeek(now));
    case 'month':    return events.filter((e) => e.startsAt <= endOfMonth(now));
    case 'date':     return events.filter((e) => isSameDay(e.startsAt, filter.date));
    default:         return events;
  }
}

function groupByDay(events: MockEvent[]): { date: Date; events: MockEvent[] }[] {
  const map = new Map<string, { date: Date; events: MockEvent[] }>();
  for (const e of events) {
    const key = startOfDay(e.startsAt).getTime().toString();
    if (!map.has(key)) map.set(key, { date: startOfDay(e.startsAt), events: [] });
    map.get(key)!.events.push(e);
  }
  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const { colors, theme } = useTheme();
  const { events, loading, error } = useEvents();
  const { selectedCity, setCity } = useLocation();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [typeFilter, setTypeFilter]       = useState<EventTypeFilter>('all');
  const [dateFilter, setDateFilter]       = useState<DateFilter>({ type: 'all' });
  const [searchQuery, setSearchQuery]     = useState('');
  const [extraFilters, setExtraFilters]   = useState<ExtraFilters>(INITIAL_EXTRA);
  const [showFilterModal, setShowFilterModal]   = useState(false);
  const [showCityPicker, setShowCityPicker]     = useState(false);
  const [showCalendar, setShowCalendar]         = useState(false);
  const [searchOpen, setSearchOpen]             = useState(false);
  const [expandedId, setExpandedId]             = useState<string | null>(null);

  const searchRef = useRef<TextInput>(null);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const activeExtraCount = Object.values(extraFilters).filter(Boolean).length;
  const calendarActive = dateFilter.type === 'date';

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery('');
    searchRef.current?.blur();
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = events.filter((e) => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (extraFilters.freeOnly && e.coverCharge !== 'Free') return false;
      if (q) {
        const hay = [e.title, e.venue.name, e.venue.neighborhood, ...e.genres, e.description]
          .join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (extraFilters.tonightOnly) {
      result = result.filter((e) => isToday(e.startsAt));
    } else {
      result = applyDateFilter(result, dateFilter);
    }
    return result;
  }, [events, typeFilter, searchQuery, extraFilters, dateFilter]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  const isSingleDay =
    dateFilter.type === 'today' ||
    dateFilter.type === 'tomorrow' ||
    dateFilter.type === 'date' ||
    extraFilters.tonightOnly;

  // ── Render ─────────────────────────────────────────────────────────────────

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
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={13} color={colors.jam} />
          <Text style={[styles.errorText, { color: colors.jam }]}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, isWide && styles.contentWide]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ──────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.appName}>ON DECK</Text>
            <TouchableOpacity
              style={styles.locationRow}
              onPress={() => setShowCityPicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="location-sharp" size={11} color={colors.gold} />
              <Text style={styles.locationText}>
                {selectedCity ? selectedCity.label : 'All Cities'}
              </Text>
              <Ionicons name="chevron-down" size={11} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.iconBtn, searchOpen && styles.iconBtnActive]}
              onPress={searchOpen ? closeSearch : openSearch}
              accessibilityLabel={searchOpen ? 'Close search' : 'Search'}
            >
              <Ionicons
                name={searchOpen ? 'close' : 'search'}
                size={18}
                color={searchOpen ? colors.gold : colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, calendarActive && styles.iconBtnActive]}
              onPress={() => setShowCalendar(true)}
              accessibilityLabel="Open calendar"
            >
              <Ionicons name="calendar-outline" size={18} color={calendarActive ? colors.gold : colors.text} />
              {calendarActive && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {(dateFilter as { date: Date }).date.getDate()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, activeExtraCount > 0 && styles.iconBtnActive]}
              onPress={() => setShowFilterModal(true)}
              accessibilityLabel="Filters"
            >
              <Ionicons name="options-outline" size={20} color={activeExtraCount > 0 ? colors.gold : colors.text} />
              {activeExtraCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{activeExtraCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search bar (collapsible) ─────────────────── */}
        {searchOpen && (
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={15} color={colors.textMuted} />
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              placeholder="Search events, venues, genres…"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Date chips ──────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          contentContainerStyle={styles.chipContent}
        >
          {DATE_CHIPS.map((chip) => (
            <FilterChip
              key={chip.label}
              label={chip.label}
              active={!calendarActive && dateFilter.type === chip.value.type}
              onPress={() => {
                setDateFilter(chip.value);
                setExtraFilters((f) => ({ ...f, tonightOnly: false }));
              }}
            />
          ))}
          {calendarActive && (
            <FilterChip
              label={`${(dateFilter as { date: Date }).date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              active
              onPress={() => setDateFilter({ type: 'all' })}
            />
          )}
        </ScrollView>

        {/* ── Type chips ──────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          contentContainerStyle={styles.chipContent}
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

        {/* ── Event list ──────────────────────────────── */}
        {grouped.length > 0 ? (
          grouped.map(({ date, events: dayEvents }) => (
            <View key={date.getTime()} style={styles.section}>
              {(!isSingleDay || grouped.length === 1) && (
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
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>◎</Text>
            <Text style={styles.emptyTitle}>Nothing on deck</Text>
            <Text style={styles.emptySub}>
              {searchQuery ? `No results for "${searchQuery}"` : 'Try a different date or filter.'}
            </Text>
            {(searchQuery || dateFilter.type !== 'all' || typeFilter !== 'all' || activeExtraCount > 0) && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  setSearchQuery('');
                  setDateFilter({ type: 'all' });
                  setTypeFilter('all');
                  setExtraFilters(INITIAL_EXTRA);
                  if (searchOpen) closeSearch();
                }}
              >
                <Text style={styles.clearBtnText}>Clear all filters</Text>
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
    content: { paddingHorizontal: 16, paddingBottom: 48 },
    contentWide: { maxWidth: 700, alignSelf: 'center', width: '100%' },

    loadingOverlay: {
      position: 'absolute', top: 80, left: 0, right: 0,
      alignItems: 'center', zIndex: 10,
    },
    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      marginHorizontal: 16, marginTop: 6,
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 4, borderWidth: 1,
      borderColor: colors.jam,
      backgroundColor: `${colors.jam}15`,
    },
    errorText: { fontSize: 12, fontWeight: '500', flex: 1 },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingTop: 24,
      paddingBottom: 16,
    },
    brand: { gap: 4 },
    appName: {
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: 6,
      color: colors.gold,
      lineHeight: 34,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    locationText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
      letterSpacing: 0.2,
    },
    actions: {
      flexDirection: 'row',
      gap: 6,
      paddingBottom: 2,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 4,
      backgroundColor: colors.surfaceHigh,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnActive: {
      borderColor: colors.gold,
      backgroundColor: `${colors.gold}15`,
    },
    badge: {
      position: 'absolute', top: -5, right: -5,
      minWidth: 16, height: 16, borderRadius: 3,
      backgroundColor: colors.gold,
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 3,
    },
    badgeText: { fontSize: 9, fontWeight: '800', color: colors.bg },

    searchBar: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.surfaceHigh,
      borderRadius: 4,
      paddingHorizontal: 14, paddingVertical: 12,
      borderWidth: 1, borderColor: colors.gold,
      marginBottom: 12,
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.text },

    chipRow: { marginBottom: 8 },
    chipContent: { paddingRight: 16, gap: 0 },

    section: { marginBottom: 6 },

    empty: {
      alignItems: 'center', paddingVertical: 80, gap: 10,
    },
    emptyIcon: {
      fontSize: 44, color: colors.textMuted,
    },
    emptyTitle: {
      fontSize: 18, fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: -0.3,
    },
    emptySub: {
      fontSize: 13, color: colors.textMuted, textAlign: 'center',
    },
    clearBtn: {
      marginTop: 8,
      paddingHorizontal: 20, paddingVertical: 10,
      borderRadius: 4, borderWidth: 1, borderColor: colors.border,
    },
    clearBtnText: {
      fontSize: 13, fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  });
}

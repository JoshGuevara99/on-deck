import { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { isSameDay, isToday } from '../utils/date';
import type { MockEvent } from '../constants/mock-data';

interface Props {
  visible: boolean;
  events: MockEvent[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
  /** When true, any non-past date is selectable (ignores event dots). Used by submit form. */
  allowAnyFutureDate?: boolean;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];

  // Padding before first day
  for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
  // Days in month
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  // Padding to complete last row
  while (days.length % 7 !== 0) days.push(null);

  return days;
}

export function CalendarModal({ visible, events, selectedDate, onSelectDate, onClose, allowAnyFutureDate }: Props) {
  const { colors } = useTheme();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const days = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  // Build a set of day-strings that have events
  const eventDays = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      set.add(
        `${e.startsAt.getFullYear()}-${e.startsAt.getMonth()}-${e.startsAt.getDate()}`
      );
    }
    return set;
  }, [events]);

  function hasEvents(date: Date): boolean {
    return eventDays.has(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const styles = makeStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close calendar">
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Pick a date</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Month navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn} accessibilityLabel="Previous month">
              <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn} accessibilityLabel="Next month">
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week labels */}
          <View style={styles.dayLabels}>
            {DAY_LABELS.map((d) => (
              <Text key={d} style={styles.dayLabel}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.grid}>
            {days.map((date, i) => {
              if (!date) return <View key={`pad-${i}`} style={styles.cell} />;

              const today = isToday(date);
              const selected = selectedDate ? isSameDay(date, selectedDate) : false;
              const withEvents = hasEvents(date);
              const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());

              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  style={styles.cell}
                  onPress={() => {
                    if (!isPast && (allowAnyFutureDate || withEvents)) {
                      onSelectDate(date);
                      onClose();
                    }
                  }}
                  activeOpacity={(allowAnyFutureDate || withEvents) && !isPast ? 0.7 : 1}
                  accessibilityLabel={`${date.toLocaleDateString()}${withEvents ? ', has events' : ''}`}
                >
                  <View style={[
                    styles.dayCircle,
                    selected && { backgroundColor: colors.gold },
                    today && !selected && styles.todayCircle,
                  ]}>
                    <Text style={[
                      styles.dayNumber,
                      selected && { color: colors.bg, fontWeight: '800' },
                      today && !selected && { color: colors.gold, fontWeight: '700' },
                      isPast && !selected && { color: colors.textMuted },
                      !withEvents && !today && !selected && { color: colors.textMuted },
                    ]}>
                      {date.getDate()}
                    </Text>
                  </View>
                  {/* Event dot */}
                  {withEvents && !isPast && (
                    <View style={[styles.dot, selected && { backgroundColor: colors.bg }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          {!allowAnyFutureDate && (
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { position: 'relative', top: 0 }]} />
                <Text style={styles.legendText}>Events on this day</Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 24,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 8,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 0.2,
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    navBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surfaceHigh,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    monthLabel: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.3,
    },
    dayLabels: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingBottom: 8,
    },
    dayLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 12,
    },
    cell: {
      width: `${100 / 7}%`,
      alignItems: 'center',
      paddingVertical: 4,
    },
    dayCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    todayCircle: {
      borderWidth: 1,
      borderColor: colors.gold,
    },
    dayNumber: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    dot: {
      position: 'absolute',
      bottom: 0,
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.gold,
    },
    legend: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingTop: 16,
      paddingHorizontal: 20,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendText: {
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}

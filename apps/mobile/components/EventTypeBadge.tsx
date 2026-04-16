import { View, Text, StyleSheet } from 'react-native';
import type { EventType } from '@on-deck/shared';
import { useTheme } from '../context/ThemeContext';

const LABELS: Record<EventType, string> = {
  OPEN_MIC: 'Open Mic',
  JAM_SESSION: 'Jam Session',
  COMEDY_NIGHT: 'Comedy Night',
  POETRY_SLAM: 'Poetry Slam',
  OPEN_STAGE: 'Open Stage',
  WORKSHOP: 'Workshop',
  OPEN_STUDIO: 'Open Studio',
};

// Gold = performance/music types, Jam = everything else
const GOLD_TYPES = new Set<EventType>(['OPEN_MIC', 'JAM_SESSION', 'OPEN_STAGE']);

export function EventTypeBadge({ type }: { type: EventType }) {
  const { colors } = useTheme();
  const accentColor = GOLD_TYPES.has(type) ? colors.gold : colors.jam;

  return (
    <View style={[styles.badge, { borderColor: accentColor }]}>
      <View style={[styles.dot, { backgroundColor: accentColor }]} />
      <Text style={[styles.label, { color: accentColor }]}>{LABELS[type]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});

import { View, Text, StyleSheet } from 'react-native';
import type { EventType } from '@on-deck/shared';
import { useTheme } from '../context/ThemeContext';

const LABELS: Record<EventType, string> = {
  OPEN_MIC: 'Open Mic',
  JAM_SESSION: 'Jam',
  COMEDY_NIGHT: 'Comedy',
  POETRY_SLAM: 'Poetry Slam',
  OPEN_STAGE: 'Open Stage',
  WORKSHOP: 'Workshop',
  OPEN_STUDIO: 'Open Studio',
};

const GOLD_TYPES = new Set<EventType>(['OPEN_MIC', 'JAM_SESSION', 'OPEN_STAGE']);

export function EventTypeBadge({ type }: { type: EventType }) {
  const { colors } = useTheme();
  const accentColor = GOLD_TYPES.has(type) ? colors.gold : colors.jam;

  return (
    <View style={[styles.badge, { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}50` }]}>
      <Text style={[styles.label, { color: accentColor }]}>{LABELS[type]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

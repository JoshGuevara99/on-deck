import { View, Text, StyleSheet } from 'react-native';
import type { EventType } from '@on-deck/shared';
import { useTheme } from '../context/ThemeContext';

const LABELS: Record<EventType, string> = {
  OPEN_MIC:      'Open Mic',
  JAM_SESSION:   'Jam',
  COMEDY_NIGHT:  'Comedy',
  POETRY_SLAM:   'Poetry',
  OPEN_STAGE:    'Open Stage',
  WORKSHOP:      'Workshop',
  OPEN_STUDIO:   'Studio',
};

const GOLD_TYPES = new Set<EventType>(['OPEN_MIC', 'JAM_SESSION', 'OPEN_STAGE']);

export function EventTypeBadge({ type }: { type: EventType }) {
  const { colors } = useTheme();
  const accentColor = GOLD_TYPES.has(type) ? colors.gold : colors.jam;

  return (
    <View style={[styles.badge, { borderColor: accentColor + '55' }]}>
      <View style={[styles.dot, { backgroundColor: accentColor }]} />
      <Text style={[styles.label, { color: accentColor }]}>{LABELS[type]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
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
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});

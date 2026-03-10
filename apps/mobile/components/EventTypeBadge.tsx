import { View, Text, StyleSheet } from 'react-native';
import type { EventType } from '@on-deck/shared';
import { useTheme } from '../context/ThemeContext';

const LABELS: Record<EventType, string> = {
  OPEN_MIC:      'Open Mic',
  JAM_SESSION:   'Jam Session',
  COMEDY_NIGHT:  'Comedy',
  POETRY_SLAM:   'Poetry Slam',
  OPEN_STAGE:    'Open Stage',
  WORKSHOP:      'Workshop',
  OPEN_STUDIO:   'Open Studio',
};

export function EventTypeBadge({ type }: { type: EventType }) {
  const { colors } = useTheme();

  const colorMap: Record<EventType, string> = {
    OPEN_MIC:     colors.gold,
    JAM_SESSION:  colors.jam,
    COMEDY_NIGHT: colors.cyan,
    POETRY_SLAM:  colors.accent,
    OPEN_STAGE:   colors.gold,
    WORKSHOP:     colors.cyan,
    OPEN_STUDIO:  colors.accent,
  };

  const accentColor = colorMap[type];

  return (
    <View style={[styles.badge, { borderColor: accentColor, backgroundColor: `${accentColor}18` }]}>
      <Text style={[styles.label, { color: accentColor }]}>{LABELS[type]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});

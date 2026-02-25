import { View, Text, StyleSheet } from 'react-native';
import type { EventType } from '@on-deck/shared';
import { useTheme } from '../context/ThemeContext';

const LABELS: Record<EventType, string> = {
  OPEN_MIC: 'Open Mic',
  JAM_SESSION: 'Jam Session',
};

export function EventTypeBadge({ type }: { type: EventType }) {
  const { colors } = useTheme();
  const accentColor = type === 'OPEN_MIC' ? colors.gold : colors.jam;

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
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

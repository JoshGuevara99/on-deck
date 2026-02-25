import { View, Text, StyleSheet } from 'react-native';
import type { EventType } from '@on-deck/shared';
import { COLORS } from '../constants/colors';

const CONFIG: Record<EventType, { label: string; color: string }> = {
  OPEN_MIC: { label: 'Open Mic', color: COLORS.gold },
  JAM_SESSION: { label: 'Jam Session', color: COLORS.jam },
};

export function EventTypeBadge({ type }: { type: EventType }) {
  const { label, color } = CONFIG[type];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
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

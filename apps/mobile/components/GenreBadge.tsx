import { View, Text, StyleSheet } from 'react-native';
import type { EventGenre } from '@on-deck/shared';

const GENRE_COLORS: Record<EventGenre, string> = {
  Comedy: '#f59e0b',  // amber
  Music:  '#6366f1',  // indigo
  Poetry: '#a855f7',  // purple
};

export function GenreBadge({ genre }: { genre: EventGenre }) {
  const color = GENRE_COLORS[genre];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{genre}</Text>
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

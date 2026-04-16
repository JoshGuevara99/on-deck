import { View, Text, StyleSheet } from 'react-native';
import type { EventGenre } from '@on-deck/shared';

const GENRE_COLORS: Record<EventGenre, string> = {
  Comedy:        '#FF2D55',
  Music:         '#0A84FF',
  Poetry:        '#BF5AF2',
  'Jam Session': '#FF9500',
};

export function GenreBadge({ genre }: { genre: EventGenre }) {
  const color = GENRE_COLORS[genre];
  return (
    <View style={[styles.badge, { borderColor: color + '55' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{genre}</Text>
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

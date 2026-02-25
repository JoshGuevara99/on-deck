import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

interface Props {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: COLORS.textMuted,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});

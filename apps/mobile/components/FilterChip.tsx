import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function FilterChip({ label, active, onPress }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 6,
      backgroundColor: colors.surface,
    },
    chipActive: {
      backgroundColor: colors.gold,
      borderColor: colors.gold,
    },
    label: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
      letterSpacing: 0.2,
    },
    labelActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
  });
}

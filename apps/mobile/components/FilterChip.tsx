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
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: colors.border,
      marginRight: 8,
      backgroundColor: 'transparent',
    },
    chipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.4,
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    labelActive: {
      color: '#FFFFFF',
    },
  });
}

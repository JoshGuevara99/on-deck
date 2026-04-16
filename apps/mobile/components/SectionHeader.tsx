import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <View style={styles.textRow}>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      marginBottom: 14,
      marginTop: 8,
    },
    line: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: 10,
    },
    textRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    title: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 2.5,
      color: colors.textSecondary,
    },
    subtitle: {
      fontSize: 11,
      color: colors.textMuted,
      letterSpacing: 0.2,
    },
  });
}

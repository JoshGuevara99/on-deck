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
      <View style={styles.tick} />
      <View style={styles.textGroup}>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14,
      marginTop: 8,
    },
    tick: {
      width: 3,
      height: 28,
      borderRadius: 2,
      backgroundColor: colors.accent,
    },
    textGroup: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 10,
    },
    title: {
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: 2.5,
      color: colors.text,
    },
    subtitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
  });
}

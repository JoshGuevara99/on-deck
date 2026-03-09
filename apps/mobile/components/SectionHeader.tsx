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
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      <View style={styles.line} />
      {subtitle && <Text style={styles.subtitle}>{subtitle.toUpperCase()}</Text>}
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
    title: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 2.5,
      color: colors.gold,
    },
    line: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    subtitle: {
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 1.5,
      color: colors.textMuted,
    },
  });
}

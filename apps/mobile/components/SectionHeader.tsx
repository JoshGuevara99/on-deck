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
    <View style={styles.band}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle.toUpperCase()}</Text>}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    band: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginHorizontal: -18,
      marginBottom: 16,
      marginTop: 12,
      paddingHorizontal: 18,
      paddingVertical: 9,
      backgroundColor: colors.surfaceHigh,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 3,
      color: colors.text,
    },
    subtitle: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.5,
      color: colors.textMuted,
    },
  });
}

import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  useWindowDimensions,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function ProfileScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const styles = useMemo(() => makeStyles(colors), [colors]);

  function handleSignIn() {
    Alert.alert('Sign In', 'Authentication integration coming soon. Stay tuned!', [
      { text: 'OK' },
    ]);
  }

  function handleCreateAccount() {
    Alert.alert('Create Account', 'Account creation coming soon. Stay tuned!', [{ text: 'OK' }]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <ScrollView
        contentContainerStyle={[styles.content, isWide && styles.contentWide]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Profile</Text>

        {/* Auth CTA */}
        <View style={styles.authCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={34} color={colors.textMuted} />
          </View>
          <Text style={styles.authTitle}>Join the community</Text>
          <Text style={styles.authSub}>
            Sign in to host events, save your favourites, and track your sets.
          </Text>
          <TouchableOpacity
            style={[styles.signInBtn, { backgroundColor: colors.gold }]}
            activeOpacity={0.85}
            onPress={handleSignIn}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            <Text style={[styles.signInText, { color: colors.bg }]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleCreateAccount}
            accessibilityRole="link"
            accessibilityLabel="Create an account"
          >
            <Text style={styles.signUpLink}>
              New here? <Text style={[styles.signUpLinkAccent, { color: colors.gold }]}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sections */}
        <ProfileSection
          title="My Events"
          icon="calendar-outline"
          empty="No hosted events yet. Submit one and get on deck."
          colors={colors}
        />
        <ProfileSection
          title="Saved"
          icon="bookmark-outline"
          empty="Tap the bookmark on any event to save it for later."
          colors={colors}
        />
        <ProfileSection
          title="Attended"
          icon="checkmark-circle-outline"
          empty="Events you've checked into will show up here."
          colors={colors}
        />

        {/* ── Settings ─────────────────────────────────── */}
        <View style={styles.settingsSection}>
          <View style={styles.settingsHeader}>
            <Ionicons name="settings-outline" size={16} color={colors.gold} />
            <Text style={styles.settingsTitle}>Settings</Text>
          </View>

          <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons
                  name={theme === 'dark' ? 'moon' : 'sunny'}
                  size={18}
                  color={colors.gold}
                  style={styles.settingIcon}
                />
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </Text>
                  <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                    {theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                  </Text>
                </View>
              </View>
              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.gold }}
                thumbColor={colors.surface}
                accessibilityLabel="Toggle dark mode"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileSection({
  title,
  icon,
  empty,
  colors,
}: {
  title: string;
  icon: string;
  empty: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={sectionStyles.container}>
      <View style={sectionStyles.header}>
        <Ionicons name={icon as any} size={16} color={colors.gold} />
        <Text style={[sectionStyles.title, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={[sectionStyles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[sectionStyles.emptyText, { color: colors.textMuted }]}>{empty}</Text>
      </View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      padding: 20,
      paddingBottom: 48,
    },
    contentWide: {
      maxWidth: 560,
      alignSelf: 'center',
      width: '100%',
    },
    heading: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 0.3,
      marginTop: 12,
      marginBottom: 20,
    },
    authCard: {
      backgroundColor: colors.surfaceHigh,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: 'center',
      gap: 10,
      marginBottom: 32,
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    authTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    authSub: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 8,
    },
    signInBtn: {
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 48,
      marginTop: 6,
    },
    signInText: {
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    signUpLink: {
      fontSize: 13,
      color: colors.textMuted,
    },
    signUpLinkAccent: {
      fontWeight: '600',
    },
    settingsSection: {
      marginBottom: 24,
    },
    settingsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    settingsTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    settingsCard: {
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden',
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingIcon: {
      marginRight: 12,
    },
    settingLabel: {
      fontSize: 15,
      fontWeight: '600',
    },
    settingDesc: {
      fontSize: 12,
      marginTop: 1,
    },
  });
}

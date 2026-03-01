import { useMemo, useEffect, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { SignOutButton } from '../../components/SignOutButton';
import { apiClient } from '../../lib/api';
import type { MockEvent } from '../../constants/mock-data';

export default function ProfileScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isSignedIn } = useAuth();
  const { isLoaded, user } = useUser();
  const router = useRouter();

  const [myEvents, setMyEvents] = useState<MockEvent[]>([]);
  const [myEventsLoading, setMyEventsLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      setMyEvents([]);
      return;
    }
    setMyEventsLoading(true);
    apiClient.events
      .list({ submittedBy: user.id })
      .then(setMyEvents)
      .catch(() => setMyEvents([]))
      .finally(() => setMyEventsLoading(false));
  }, [isLoaded, isSignedIn, user?.id]);

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

        {/* Auth CTA / signed-in state */}
        <View style={styles.authCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={34} color={colors.textMuted} />
          </View>
          {isSignedIn ? (
            <>
              <Text style={styles.authTitle}>{user?.emailAddresses[0].emailAddress}</Text>
              <SignOutButton />
            </>
          ) : (
            <>
              <Text style={styles.authTitle}>Join the community</Text>
              <Text style={styles.authSub}>
                Sign in to host events, save your favourites, and track your sets.
              </Text>
              <TouchableOpacity
                style={[styles.signInBtn, { backgroundColor: colors.gold }]}
                activeOpacity={0.85}
                onPress={() => router.push('/(auth)/sign-in')}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
              >
                <Text style={[styles.signInText, { color: colors.bg }]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/(auth)/sign-up')}
                accessibilityRole="link"
                accessibilityLabel="Create an account"
              >
                <Text style={styles.signUpLink}>
                  New here?{' '}
                  <Text style={[styles.signUpLinkAccent, { color: colors.gold }]}>Create an account</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* My Events */}
        <MyEventsSection
          events={myEvents}
          loading={myEventsLoading}
          isSignedIn={!!isSignedIn}
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

function MyEventsSection({
  events,
  loading,
  isSignedIn,
  colors,
}: {
  events: MockEvent[];
  loading: boolean;
  isSignedIn: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={sectionStyles.container}>
      <View style={sectionStyles.header}>
        <Ionicons name="calendar-outline" size={16} color={colors.gold} />
        <Text style={[sectionStyles.title, { color: colors.text }]}>My Events</Text>
      </View>
      {loading ? (
        <View style={[sectionStyles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : !isSignedIn || events.length === 0 ? (
        <View style={[sectionStyles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[sectionStyles.emptyText, { color: colors.textMuted }]}>
            {isSignedIn
              ? 'No hosted events yet. Submit one and get on deck.'
              : 'Sign in to see your events.'}
          </Text>
        </View>
      ) : (
        <View style={[sectionStyles.listBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {events.map((event, idx) => (
            <View
              key={event.id}
              style={[
                sectionStyles.eventRow,
                idx < events.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <Text style={[sectionStyles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={[sectionStyles.eventVenue, { color: colors.textMuted }]} numberOfLines={1}>
                {event.venue.name}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
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
  listBox: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  eventRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventVenue: {
    fontSize: 12,
    marginTop: 2,
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

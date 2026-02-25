import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <ScrollView
        contentContainerStyle={[styles.content, isWide && styles.contentWide]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Profile</Text>

        {/* Auth CTA */}
        <View style={styles.authCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={34} color={COLORS.textMuted} />
          </View>
          <Text style={styles.authTitle}>Join the community</Text>
          <Text style={styles.authSub}>
            Sign in to host events, save your favourites, and track your sets.
          </Text>
          <TouchableOpacity style={styles.signInBtn} activeOpacity={0.85}>
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.signUpLink}>
              New here? <Text style={styles.signUpLinkAccent}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sections */}
        <ProfileSection
          title="My Events"
          icon="calendar-outline"
          empty="No hosted events yet. Submit one and get on deck."
        />
        <ProfileSection
          title="Saved"
          icon="bookmark-outline"
          empty="Tap the bookmark on any event to save it for later."
        />
        <ProfileSection
          title="Attended"
          icon="checkmark-circle-outline"
          empty="Events you've checked into will show up here."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileSection({
  title,
  icon,
  empty,
}: {
  title: string;
  icon: string;
  empty: string;
}) {
  return (
    <View style={sectionStyles.container}>
      <View style={sectionStyles.header}>
        <Ionicons name={icon as any} size={16} color={COLORS.gold} />
        <Text style={sectionStyles.title}>{title}</Text>
      </View>
      <View style={sectionStyles.emptyBox}>
        <Text style={sectionStyles.emptyText}>{empty}</Text>
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
    color: COLORS.text,
  },
  emptyBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
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
    color: COLORS.text,
    letterSpacing: 0.3,
    marginTop: 12,
    marginBottom: 20,
  },
  authCard: {
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginBottom: 32,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  authSub: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  signInBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginTop: 6,
  },
  signInText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A0A12',
    letterSpacing: 0.5,
  },
  signUpLink: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  signUpLinkAccent: {
    color: COLORS.gold,
    fontWeight: '600',
  },
});

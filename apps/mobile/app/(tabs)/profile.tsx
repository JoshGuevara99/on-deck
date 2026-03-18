import { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { SignOutButton } from '../../components/SignOutButton';
import { EditEventModal } from '../../components/EditEventModal';
import { useAttending } from '../../context/AttendingContext';
import { apiClient } from '../../lib/api';
import type { MockEvent } from '../../constants/mock-data';
import type { User, PerformerType } from '@on-deck/shared';

const PERFORMER_TYPES: { value: PerformerType; label: string }[] = [
  { value: 'MUSICIAN',    label: 'Musician' },
  { value: 'COMEDIAN',    label: 'Comedian' },
  { value: 'POET',        label: 'Poet' },
  { value: 'STORYTELLER', label: 'Storyteller' },
  { value: 'OTHER',       label: 'Other' },
];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isSignedIn, getToken } = useAuth();
  const { isLoaded, user } = useUser();
  const router = useRouter();

  const { attending } = useAttending();

  const [profile, setProfile] = useState<User | null>(null);
  const [mySubmissions, setMySubmissions] = useState<MockEvent[]>([]);
  const [mySignups, setMySignups] = useState<Array<{ event: MockEvent; status: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState<MockEvent | null>(null);

  // Combined attending + signed-up events, deduped by event ID (signup takes priority)
  // attending comes from AttendingContext — updates instantly when user RSVPs on discover tab
  const combinedEvents = useMemo(() => {
    const map = new Map<string, { event: MockEvent; label: string; isSignup: boolean; status?: string }>();
    for (const { event } of attending) {
      map.set(event.id, { event, label: 'Going', isSignup: false });
    }
    for (const { event, status } of mySignups) {
      map.set(event.id, {
        event,
        label: status === 'SIGNED_UP' ? 'On list' : status === 'PERFORMED' ? 'Performed' : status,
        isSignup: true,
        status,
      });
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.event.startsAt).getTime() - new Date(b.event.startsAt).getTime()
    );
  }, [attending, mySignups]);

  // Identity edit state
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [performerType, setPerformerType] = useState<PerformerType | null>(null);
  const [instruments, setInstruments] = useState('');
  const [genres, setGenres] = useState('');
  const [savingIdentity, setSavingIdentity] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    const safetyTimer = setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);

    setLoading(true);
    getToken().then((token) => {
      if (!token || cancelled) {
        clearTimeout(safetyTimer);
        if (!cancelled) setLoading(false);
        return;
      }
      Promise.all([
        apiClient.users.me(token),
        apiClient.users.myEvents(token),
        apiClient.users.mySignups(token),
      ]).then(([profileData, eventsData, signupsData]) => {
        if (cancelled) return;
        setProfile(profileData);
        setMySubmissions(eventsData);
        setMySignups(signupsData.map((s) => ({ event: s.event, status: s.status })));
        setDisplayName(profileData.displayName ?? '');
        setBio(profileData.bio ?? '');
        setAvatarUrl(profileData.avatarUrl ?? '');
        setInstagramHandle(profileData.instagramHandle ?? '');
        setTiktokHandle(profileData.tiktokHandle ?? '');
        setPerformerType(profileData.performerType);
        setInstruments((profileData.instruments ?? []).join(', '));
        setGenres((profileData.genres ?? []).join(', '));
      }).catch(() => {
        // API unavailable — sections will show empty state
      }).finally(() => {
        clearTimeout(safetyTimer);
        if (!cancelled) setLoading(false);
      });
    }).catch(() => {
      clearTimeout(safetyTimer);
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; clearTimeout(safetyTimer); };
  // getToken is intentionally excluded — it changes reference every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  async function saveIdentity() {
    const token = await getToken();
    if (!token) return;
    setSavingIdentity(true);
    try {
      const updated = await apiClient.users.update(token, {
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || null,
        instagramHandle: instagramHandle.trim() || null,
        tiktokHandle: tiktokHandle.trim() || null,
        performerType: performerType,
        instruments: instruments.split(',').map((s) => s.trim()).filter(Boolean),
        genres: genres.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setProfile(updated);
      setEditingIdentity(false);
    } catch {
      Alert.alert('Error', 'Could not save your profile. Try again.');
    } finally {
      setSavingIdentity(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.bg}
      />
      <ScrollView
        contentContainerStyle={[styles.content, isWide && styles.contentWide]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Profile</Text>

        {/* ── Auth card ──────────────────────────────── */}
        <View style={styles.authCard}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}>
              <Ionicons name="person" size={34} color={colors.textMuted} />
            </View>
          )}
          {isSignedIn ? (
            <>
              <Text style={styles.authTitle}>
                {profile?.displayName || user?.emailAddresses[0].emailAddress}
              </Text>
              {profile?.performerType && (
                <View style={[styles.typeBadge, { backgroundColor: `${colors.gold}20`, borderColor: `${colors.gold}50` }]}>
                  <Text style={[styles.typeBadgeText, { color: colors.gold }]}>
                    {PERFORMER_TYPES.find((t) => t.value === profile.performerType)?.label ?? profile.performerType}
                  </Text>
                </View>
              )}
              {profile?.performanceCount ? (
                <Text style={styles.performanceCount}>
                  {profile.performanceCount} performance{profile.performanceCount !== 1 ? 's' : ''}
                </Text>
              ) : null}
              <SignOutButton />
            </>
          ) : (
            <>
              <Text style={styles.authTitle}>Join the community</Text>
              <Text style={styles.authSub}>
                Sign in to host events, sign up for slots, and track your sets.
              </Text>
              <TouchableOpacity
                style={[styles.signInBtn, { backgroundColor: colors.gold }]}
                activeOpacity={0.85}
                onPress={() => router.push('/(auth)/sign-in')}
              >
                <Text style={[styles.signInText, { color: colors.bg }]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(auth)/sign-up')}>
                <Text style={styles.signUpLink}>
                  New here?{' '}
                  <Text style={[styles.signUpLinkAccent, { color: colors.gold }]}>Create an account</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Performer Identity ─────────────────────── */}
        {isSignedIn && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="mic-outline" size={16} color={colors.gold} />
                <Text style={styles.sectionTitle}>Performer Identity</Text>
              </View>
              {!editingIdentity && (
                <TouchableOpacity onPress={() => setEditingIdentity(true)}>
                  <Text style={[styles.editBtn, { color: colors.gold }]}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {editingIdentity ? (
              <View style={[styles.identityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <FieldLabel text="Display Name" colors={colors} />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceHigh, borderColor: colors.border, color: colors.text }]}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="How you appear to hosts"
                  placeholderTextColor={colors.textMuted}
                />

                <FieldLabel text="Photo URL" colors={colors} />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceHigh, borderColor: colors.border, color: colors.text }]}
                  value={avatarUrl}
                  onChangeText={setAvatarUrl}
                  placeholder="https://..."
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />

                <FieldLabel text="Instagram" colors={colors} />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceHigh, borderColor: colors.border, color: colors.text }]}
                  value={instagramHandle}
                  onChangeText={setInstagramHandle}
                  placeholder="handle (without @)"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <FieldLabel text="TikTok" colors={colors} />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceHigh, borderColor: colors.border, color: colors.text }]}
                  value={tiktokHandle}
                  onChangeText={setTiktokHandle}
                  placeholder="handle (without @)"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <FieldLabel text="I perform as" colors={colors} />
                <View style={styles.typeGrid}>
                  {PERFORMER_TYPES.map(({ value, label }) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.typeChip,
                        { borderColor: colors.border, backgroundColor: colors.surfaceHigh },
                        performerType === value && { backgroundColor: colors.gold, borderColor: colors.gold },
                      ]}
                      onPress={() => setPerformerType(performerType === value ? null : value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.typeChipText,
                        { color: colors.textSecondary },
                        performerType === value && { color: colors.bg, fontWeight: '700' },
                      ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {performerType === 'MUSICIAN' && (
                  <>
                    <FieldLabel text="Instruments" colors={colors} />
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surfaceHigh, borderColor: colors.border, color: colors.text }]}
                      value={instruments}
                      onChangeText={setInstruments}
                      placeholder="e.g. guitar, vocals, bass"
                      placeholderTextColor={colors.textMuted}
                    />
                  </>
                )}

                <FieldLabel text="Genres / Style" colors={colors} />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceHigh, borderColor: colors.border, color: colors.text }]}
                  value={genres}
                  onChangeText={setGenres}
                  placeholder="e.g. jazz, stand-up, spoken word"
                  placeholderTextColor={colors.textMuted}
                />

                <FieldLabel text="Bio" colors={colors} />
                <TextInput
                  style={[styles.input, styles.inputMultiline, { backgroundColor: colors.surfaceHigh, borderColor: colors.border, color: colors.text }]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="A line about you..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <View style={styles.identityActions}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setEditingIdentity(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: colors.gold }, savingIdentity && { opacity: 0.6 }]}
                    onPress={saveIdentity}
                    disabled={savingIdentity}
                  >
                    {savingIdentity
                      ? <ActivityIndicator color={colors.bg} size="small" />
                      : <Text style={[styles.saveBtnText, { color: colors.bg }]}>Save</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.identityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {profile?.bio ? (
                  <Text style={[styles.bioText, { color: colors.textSecondary }]}>{profile.bio}</Text>
                ) : null}
                {(profile?.instagramHandle || profile?.tiktokHandle) && (
                  <View style={styles.socialsRow}>
                    {profile.instagramHandle && (
                      <TouchableOpacity
                        style={[styles.socialChip, { backgroundColor: '#E1306C18', borderColor: '#E1306C40' }]}
                        onPress={() => Linking.openURL(`https://instagram.com/${profile.instagramHandle}`)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="logo-instagram" size={14} color="#E1306C" />
                        <Text style={[styles.socialChipText, { color: '#E1306C' }]}>@{profile.instagramHandle}</Text>
                      </TouchableOpacity>
                    )}
                    {profile.tiktokHandle && (
                      <TouchableOpacity
                        style={[styles.socialChip, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}
                        onPress={() => Linking.openURL(`https://tiktok.com/@${profile.tiktokHandle}`)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="musical-note-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.socialChipText, { color: colors.textSecondary }]}>@{profile.tiktokHandle}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {profile?.instruments && profile.instruments.length > 0 && (
                  <View style={styles.tagRow}>
                    {profile.instruments.map((i) => (
                      <View key={i} style={[styles.tag, { backgroundColor: `${colors.gold}15`, borderColor: `${colors.gold}40` }]}>
                        <Text style={[styles.tagText, { color: colors.gold }]}>{i}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {profile?.genres && profile.genres.length > 0 && (
                  <View style={styles.tagRow}>
                    {profile.genres.map((g) => (
                      <View key={g} style={[styles.tag, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}>
                        <Text style={[styles.tagText, { color: colors.textMuted }]}>{g}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {!profile?.bio && !profile?.instruments?.length && !profile?.genres?.length && (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    Tell hosts who you are — add your instruments, style, and a bio.
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── My Events (attending + signed up to perform) ──────────────────────── */}
        {isSignedIn && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="calendar-outline" size={16} color={colors.gold} />
                <Text style={styles.sectionTitle}>My Events</Text>
              </View>
            </View>
            {loading ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ActivityIndicator color={colors.gold} />
              </View>
            ) : combinedEvents.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No events yet. Tap "I'm Going" on any event or sign up to perform.
                </Text>
              </View>
            ) : (
              <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {combinedEvents.map(({ event, label, isSignup, status }, idx) => (
                  <View
                    key={event.id}
                    style={[
                      styles.eventRow,
                      idx < combinedEvents.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={styles.eventRowLeft}>
                      <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text style={[styles.eventMeta, { color: colors.textMuted }]} numberOfLines={1}>
                        {event.venue.name}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isSignup && status === 'PERFORMED'
                          ? `${colors.gold}20`
                          : isSignup
                          ? `${colors.jam}20`
                          : '#22c55e20',
                        borderColor: isSignup && status === 'PERFORMED'
                          ? `${colors.gold}50`
                          : isSignup
                          ? `${colors.jam}50`
                          : '#22c55e50',
                      },
                    ]}>
                      <Text style={[
                        styles.statusText,
                        {
                          color: isSignup && status === 'PERFORMED'
                            ? colors.gold
                            : isSignup
                            ? colors.jam
                            : '#22c55e',
                        },
                      ]}>
                        {label}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── My Submissions (events the user submitted) ──────────────────────── */}
        {isSignedIn && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <TouchableOpacity onPress={() => router.push('/(tabs)/submit')} activeOpacity={0.7}>
                  <Ionicons name="add-circle-outline" size={16} color={colors.gold} />
                </TouchableOpacity>
                <Text style={styles.sectionTitle}>My Submissions</Text>
              </View>
            </View>
            {loading ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ActivityIndicator color={colors.gold} />
              </View>
            ) : mySubmissions.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No events submitted yet. Go to Submit to add one.
                </Text>
              </View>
            ) : (
              <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {mySubmissions.map((event, idx) => (
                  <View
                    key={event.id}
                    style={[
                      styles.eventRow,
                      idx < mySubmissions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={styles.eventRowLeft}>
                      <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text style={[styles.eventMeta, { color: colors.textMuted }]} numberOfLines={1}>
                        {event.venue.name}
                        {event.signupsEnabled ? ` · ${event.signupCount} signed up` : ''}
                      </Text>
                    </View>
                    <View style={styles.submissionActions}>
                      <TouchableOpacity
                        style={styles.manageBtn}
                        onPress={() => setEditingEvent(event)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="create-outline" size={14} color={colors.gold} />
                        <Text style={[styles.manageBtnText, { color: colors.gold }]}>Edit</Text>
                      </TouchableOpacity>
                      {event.signupsEnabled && (
                        <TouchableOpacity
                          style={styles.manageBtn}
                          onPress={() => router.push(`/roster/${event.id}` as any)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.manageBtnText, { color: colors.textMuted }]}>Manage</Text>
                          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        {editingEvent && (
          <EditEventModal
            event={editingEvent}
            visible={!!editingEvent}
            onClose={() => setEditingEvent(null)}
            onSave={(updated) => {
              setMySubmissions((prev) => prev.map((e) => e.id === updated.id ? updated : e));
              setEditingEvent(null);
            }}
          />
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function FieldLabel({ text, colors }: { text: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <Text style={{
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginTop: 14,
      marginBottom: 8,
    }}>
      {text}
    </Text>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 20, paddingBottom: 48 },
    contentWide: { maxWidth: 560, alignSelf: 'center', width: '100%' },
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
      marginBottom: 28,
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
    avatarImg: {
      width: 76,
      height: 76,
      borderRadius: 38,
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
    typeBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
    },
    typeBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    performanceCount: {
      fontSize: 13,
      color: colors.textMuted,
    },
    signInBtn: {
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 48,
      marginTop: 6,
    },
    signInText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
    signUpLink: { fontSize: 13, color: colors.textMuted },
    signUpLinkAccent: { fontWeight: '600' },
    section: { marginBottom: 24 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    editBtn: { fontSize: 14, fontWeight: '600' },
    identityCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 16,
    },
    bioText: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
    socialsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    socialChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
    },
    socialChipText: { fontSize: 12, fontWeight: '600' },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
    tag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
    },
    tagText: { fontSize: 12, fontWeight: '500' },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 15,
    },
    inputMultiline: { height: 80, paddingTop: 11 },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    typeChip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1,
    },
    typeChipText: { fontSize: 13, fontWeight: '600' },
    identityActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    cancelBtnText: { fontSize: 14, fontWeight: '600' },
    saveBtn: {
      flex: 1,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    saveBtnText: { fontSize: 14, fontWeight: '800' },
    emptyCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 20,
      alignItems: 'center',
    },
    emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
    listCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    eventRowLeft: { flex: 1, marginRight: 8 },
    eventTitle: { fontSize: 14, fontWeight: '600' },
    eventMeta: { fontSize: 12, marginTop: 2 },
    submissionActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    manageBtnText: { fontSize: 13, fontWeight: '700' },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
    },
    statusText: { fontSize: 11, fontWeight: '700' },
  });
}

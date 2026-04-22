import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Share,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../context/ThemeContext';
import { EventTypeBadge } from '../../components/EventTypeBadge';
import { GenreBadge } from '../../components/GenreBadge';
import type { EventGenre } from '@on-deck/shared';
import { SignUpModal } from '../../components/SignUpModal';
import { EditEventModal } from '../../components/EditEventModal';
import { QRModal } from '../../components/QRModal';
import { formatDayLabel, formatTime } from '../../utils/date';
import { apiClient } from '../../lib/api';
import { useAttending } from '../../context/AttendingContext';
import type { MockEvent } from '../../constants/mock-data';
import type { CreateSignupInput, PublicSignup } from '@on-deck/shared';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { isSignedIn, getToken, userId } = useAuth();
  const { attendingIds, addAttending, removeAttending } = useAttending();
  const styles = makeStyles(colors);

  const [event, setEvent] = useState<MockEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [signupCount, setSignupCount] = useState(0);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [lineup, setLineup] = useState<PublicSignup[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goBack = (): void => { router.canGoBack() ? router.back() : router.replace('/(tabs)'); };

  const rsvped = event ? attendingIds.has(event.id) : false;
  const isHost = isSignedIn && event?.hostId === userId;
  const isInLineup = isSignedIn && lineup.some((s) => s.user?.id === userId && s.status === 'SIGNED_UP');
  const accentColor = event?.type === 'OPEN_MIC' ? colors.gold : colors.jam;
  const slotsLeft = event?.maxSlots != null ? event.maxSlots - signupCount : null;
  const isFull = slotsLeft !== null && slotsLeft <= 0;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await apiClient.events.getById(id);
      setEvent(data);
      setAttendeeCount(data.attendeeCount);
      setSignupCount(data.signupCount);
    } catch {
      Alert.alert('Error', 'Could not load the event.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const loadLineup = useCallback(async () => {
    if (!id) return;
    try {
      const token = await getToken();
      const data = await apiClient.signups.get(id, token ?? undefined);
      if (Array.isArray(data)) setLineup(data as PublicSignup[]);
    } catch {
      // non-blocking — lineup section stays stale
    }
  }, [id, getToken]);

  // Start polling lineup once the event is loaded and signups are enabled
  useEffect(() => {
    if (!event?.signupsEnabled) return;
    loadLineup();
    pollRef.current = setInterval(loadLineup, 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [event?.signupsEnabled, loadLineup]);

  async function handleRsvp() {
    if (!event) return;
    const going = !rsvped;

    // Optimistic update
    if (going) {
      addAttending(event);
      setAttendeeCount((c) => c + 1);
    } else {
      removeAttending(event.id);
      setAttendeeCount((c) => Math.max(0, c - 1));
    }

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      if (going) {
        await apiClient.attendees.rsvp(event.id, token);
      } else {
        await apiClient.attendees.cancel(event.id, token);
      }
    } catch {
      // Roll back optimistic update on failure
      if (going) {
        removeAttending(event.id);
        setAttendeeCount((c) => Math.max(0, c - 1));
      } else {
        addAttending(event);
        setAttendeeCount((c) => c + 1);
      }
    }
  }

  async function handleSignUp(input: CreateSignupInput) {
    if (!event) throw new Error('No event');
    const token = isSignedIn ? await getToken() : undefined;
    const result = await apiClient.signups.create(event.id, input, token ?? undefined);
    setSignupCount((c) => c + 1);
    loadLineup();
    return result;
  }

  async function handleLeaveLineup() {
    if (!event) return;
    Alert.alert('Leave Lineup', 'Remove yourself from the lineup?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            await apiClient.signups.cancel(event.id, token);
            setSignupCount((c) => Math.max(0, c - 1));
            loadLineup();
          } catch {
            Alert.alert('Error', 'Could not remove you from the lineup.');
          }
        },
      },
    ]);
  }

  async function handleShare() {
    if (!event) return;
    const appUrl = process.env.EXPO_PUBLIC_APP_URL ?? 'http://localhost:8081';
    const url = `${appUrl}/e/${event.id}`;
    const message = `${event.title} @ ${event.venue.name}`;
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({ title: event.title, text: message, url });
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          Alert.alert('Link copied', 'Event link copied to clipboard.');
        }
      } else {
        await Share.share({ message: `${message}\n${url}`, url });
      }
    } catch {
      // user cancelled — no-op
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered]}>
        <ActivityIndicator color={colors.gold} size="large" />
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered]}>
        <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyText}>Event not found</Text>
        <TouchableOpacity onPress={() => goBack()} style={styles.backBtnCenter}>
          <Text style={[styles.backBtnCenterText, { color: colors.gold }]}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1E1A3C' }]} />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* Hero image */}
        {event.coverImageUrl ? (
          <View style={styles.heroContainer}>
            <Image source={{ uri: event.coverImageUrl }} style={styles.heroImage} resizeMode="cover" />
            {/* Back button over image */}
            <TouchableOpacity style={styles.backBtnOverlay} onPress={() => goBack()} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            {/* gradient hint at bottom */}
            <View style={styles.heroGradient} />
            {event.coverImageAttribution && (
              <Text style={styles.imageCredit}>{event.coverImageAttribution}</Text>
            )}
          </View>
        ) : (
          /* No image — plain back button */
          <View style={styles.plainHeader}>
            <TouchableOpacity onPress={() => goBack()} style={styles.backBtnPlain}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.body}>
          {/* Type + genre badges */}
          <View style={styles.badgeRow}>
            <EventTypeBadge type={event.type} />
            {event.genres.map((g) => {
              const known: EventGenre[] = ['Comedy', 'Music', 'Poetry', 'Jam Session'];
              if (known.includes(g as EventGenre)) {
                return <GenreBadge key={g} genre={g as EventGenre} />;
              }
              return (
                <View key={g} style={[styles.genreTag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.genreText, { color: colors.textSecondary }]}>{g}</Text>
                </View>
              );
            })}
          </View>

          {/* Title */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Date + time */}
          <Text style={styles.time}>
            {formatDayLabel(event.startsAt)} · {formatTime(event.startsAt)}
            {event.endsAt ? ` – ${formatTime(event.endsAt)}` : ''}
          </Text>

          {/* Venue */}
          <View style={styles.venueRow}>
            <Ionicons name="location-sharp" size={15} color={accentColor} />
            <View>
              <Text style={styles.venueName}>{event.venue.name}</Text>
              <Text style={styles.venueAddress}>{event.venue.address}</Text>
            </View>
          </View>

          {/* Description */}
          {event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : null}


          {/* Detail rows */}
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DetailRow icon="hand-left-outline" label="Sign up" color={accentColor}
              value={event.signUpMethod === 'door' ? 'At the door' : event.signUpMethod === 'online' ? 'Online' : 'Via app'} />
            {event.slotDuration && (
              <DetailRow icon="hourglass-outline" label="Slot" color={accentColor} value={event.slotDuration} />
            )}
            <DetailRow
              icon={event.coverCharge === 'Free' ? 'gift-outline' : 'cash-outline'}
              label="Cover"
              color={accentColor}
              value={event.coverCharge || 'Free'}
            />
            {event.backline && event.backline.length > 0 && (
              <DetailRow icon="musical-notes-outline" label="Backline" color={accentColor} value={event.backline.join(', ')} />
            )}
            {event.isRecurring && event.recurringDescription && (
              <DetailRow icon="repeat" label="Recurring" color={accentColor} value={event.recurringDescription} />
            )}
            {event.venue.instagramHandle && (
              <TouchableOpacity
                onPress={() => {
                  const handle = event.venue.instagramHandle!.replace(/^@/, '');
                  Linking.openURL(`https://instagram.com/${handle}`);
                }}
              >
                <DetailRow icon="logo-instagram" label="Instagram" color="#E1306C"
                  value={event.venue.instagramHandle.startsWith('@') ? event.venue.instagramHandle : `@${event.venue.instagramHandle}`}
                  valueStyle={{ color: '#E1306C' }}
                />
              </TouchableOpacity>
            )}
            {event.sourceUrl && (
              <TouchableOpacity onPress={() => Linking.openURL(event.sourceUrl!)}>
                <DetailRow
                  icon="link-outline"
                  label="Found at"
                  color={accentColor}
                  value={new URL(event.sourceUrl).hostname.replace(/^www\./, '')}
                  valueStyle={{ color: accentColor, textDecorationLine: 'underline' }}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <Ionicons name="people-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.statsText, { color: colors.textMuted }]}>
              {attendeeCount + signupCount} going
              {event.signupsEnabled && slotsLeft !== null && (isFull ? ' · Full' : ` · ${slotsLeft} slots left`)}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            {/* RSVP — auth required */}
            <TouchableOpacity
              style={[styles.rsvpBtn, rsvped ? styles.rsvpBtnGoing : { backgroundColor: '#6366f1' }]}
              onPress={isSignedIn ? handleRsvp : () => router.push('/(auth)/sign-in')}
              activeOpacity={0.85}
            >
              <Ionicons name={rsvped ? 'checkmark-circle' : 'add-circle-outline'} size={18} color="#fff" />
              <Text style={styles.rsvpBtnText}>{rsvped ? 'Going' : 'RSVP'}</Text>
            </TouchableOpacity>

            {/* Sign up to perform — open to everyone */}
            {event.signupsEnabled && event.signUpMethod !== 'door' && !isInLineup && (
              <TouchableOpacity
                style={[styles.signUpBtn, { backgroundColor: accentColor }, isFull && styles.btnDisabled]}
                onPress={() => setShowSignUp(true)}
                disabled={isFull}
                activeOpacity={0.85}
              >
                <Ionicons name="mic" size={18} color={isFull ? colors.textMuted : '#fff'} />
                <Text style={[styles.signUpBtnText, isFull && { color: colors.textMuted }]}>
                  {isFull ? 'Full' : 'Sign Up to Perform'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Leave lineup — only shown when signed up and not the host */}
            {isInLineup && !isHost && (
              <TouchableOpacity
                style={[styles.shareBtn, { borderColor: colors.border }]}
                onPress={handleLeaveLineup}
                activeOpacity={0.85}
              >
                <Ionicons name="exit-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.shareBtnText, { color: colors.textMuted }]}>Leave Lineup</Text>
              </TouchableOpacity>
            )}

            {/* Share */}
            <TouchableOpacity
              style={[styles.shareBtn, { borderColor: colors.border }]}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.shareBtnText, { color: colors.textSecondary }]}>Share Event</Text>
            </TouchableOpacity>

            {/* Host: QR code */}
            {isHost && (
              <TouchableOpacity
                style={[styles.shareBtn, { borderColor: colors.border }]}
                onPress={() => setShowQR(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="qr-code-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.shareBtnText, { color: colors.textSecondary }]}>QR Code</Text>
              </TouchableOpacity>
            )}

            {/* Host: manage roster */}
            {isHost && (
              <TouchableOpacity
                style={[styles.manageBtn, { borderColor: colors.gold, backgroundColor: `${colors.gold}15` }]}
                onPress={() => router.push(`/roster/${event.id}` as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="list" size={18} color={colors.gold} />
                <Text style={[styles.manageBtnText, { color: colors.gold }]}>Manage Roster</Text>
              </TouchableOpacity>
            )}

            {/* Host: edit event */}
            {isHost && (
              <TouchableOpacity
                style={[styles.editBtn, { borderColor: colors.border }]}
                onPress={() => setShowEdit(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.editBtnText, { color: colors.textSecondary }]}>Edit Event</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Lineup ──────────────────────────────────────────────── */}
          {event.signupsEnabled && (
            <View style={styles.lineupSection}>
              <Text style={[styles.lineupHeading, { color: colors.textMuted }]}>
                LINEUP · {lineup.filter(s => s.status === 'SIGNED_UP').length} on deck
              </Text>

              {lineup.length === 0 ? (
                <Text style={[styles.lineupEmpty, { color: colors.textMuted }]}>
                  No one's signed up yet — be first.
                </Text>
              ) : (
                lineup.map((slot, i) => {
                  const name = slot.guestName ?? slot.user?.displayName ?? slot.user?.name ?? 'Performer';
                  const isMe = !!slot.user && slot.user.id === userId;
                  const performed = slot.status === 'PERFORMED';
                  const detail = [
                    slot.performerType,
                    slot.instruments.join(', '),
                    slot.genres.join(', '),
                  ].filter(Boolean).join(' · ');

                  const avatarEl = slot.user?.avatarUrl ? (
                    <Image source={{ uri: slot.user.avatarUrl }} style={styles.lineupAvatar} />
                  ) : (
                    <View style={[styles.lineupAvatar, styles.lineupAvatarFallback, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}>
                      <Text style={[styles.lineupAvatarInitials, { color: colors.textSecondary }]}>
                        {name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                      </Text>
                    </View>
                  );

                  return (
                    <View
                      key={slot.id}
                      style={[
                        styles.lineupRow,
                        { borderBottomColor: colors.border },
                        isMe && { backgroundColor: `${accentColor}12` },
                      ]}
                    >
                      <Text style={[styles.lineupNum, { color: performed ? colors.textMuted : accentColor }]}>
                        {performed ? '✓' : i + 1}
                      </Text>
                      <TouchableOpacity
                        onPress={() => slot.user && router.push(`/users/${slot.user.id}` as any)}
                        activeOpacity={slot.user ? 0.75 : 1}
                        style={{ opacity: performed ? 0.55 : 1 }}
                      >
                        {avatarEl}
                      </TouchableOpacity>
                      <View style={styles.lineupInfo}>
                        <TouchableOpacity onPress={() => slot.user && router.push(`/users/${slot.user.id}` as any)} activeOpacity={slot.user ? 0.75 : 1}>
                          <Text style={[styles.lineupName, { color: performed ? colors.textMuted : colors.text, textDecorationLine: performed ? 'line-through' : 'none' }]}>
                            {name}{isMe ? ' (you)' : ''}
                          </Text>
                        </TouchableOpacity>
                        {!!detail && (
                          <Text style={[styles.lineupDetail, { color: colors.textMuted }]} numberOfLines={1}>
                            {detail}
                          </Text>
                        )}
                        {(slot.instagramHandle || slot.tiktokHandle) && (
                          <View style={styles.lineupSocials}>
                            {slot.instagramHandle && (
                              <TouchableOpacity onPress={() => Linking.openURL(`https://instagram.com/${slot.instagramHandle}`)}>
                                <Text style={[styles.lineupHandle, { color: '#E1306C' }]}>
                                  @{slot.instagramHandle}
                                </Text>
                              </TouchableOpacity>
                            )}
                            {slot.tiktokHandle && (
                              <TouchableOpacity onPress={() => Linking.openURL(`https://tiktok.com/@${slot.tiktokHandle}`)}>
                                <Text style={[styles.lineupHandle, { color: colors.textSecondary }]}>
                                  @{slot.tiktokHandle} TikTok
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {event && (
        <>
          <SignUpModal
            event={event}
            visible={showSignUp}
            guestMode={!isSignedIn}
            onClose={() => setShowSignUp(false)}
            onSubmit={handleSignUp}
          />
          <EditEventModal
            event={event}
            visible={showEdit}
            onClose={() => setShowEdit(false)}
            onSave={(updated) => setEvent(updated)}
            onDelete={() => goBack()}
          />
          <QRModal
            visible={showQR}
            url={`${process.env.EXPO_PUBLIC_APP_URL ?? 'http://localhost:8081'}/e/${event.id}`}
            title={event.title}
            onClose={() => setShowQR(false)}
          />
        </>
      )}
    </SafeAreaView>
  );
}

function DetailRow({
  icon, label, value, color, valueStyle,
}: {
  icon: string; label: string; value: string; color: string; valueStyle?: object;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 }}>
      <Ionicons name={icon as any} size={15} color={color} style={{ marginTop: 1 }} />
      <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500', width: 68, flexShrink: 0 }}>{label}</Text>
      <Text style={[{ fontSize: 13, color: colors.text, flex: 1, lineHeight: 18 }, valueStyle]}>{value}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1 },
    centered: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
    emptyText: { fontSize: 17, fontWeight: '700', color: colors.textSecondary },
    backBtnCenter: { marginTop: 8 },
    backBtnCenterText: { fontSize: 15, fontWeight: '600' },

    heroContainer: { position: 'relative' },
    heroImage: { width: '100%', height: 260 },
    backBtnOverlay: {
      position: 'absolute',
      top: 16,
      left: 16,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroGradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 80,
      backgroundColor: 'transparent',
    },
    imageCredit: {
      position: 'absolute',
      bottom: 6,
      right: 10,
      fontSize: 9,
      color: 'rgba(255,255,255,0.7)',
    },

    plainHeader: {
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 4,
    },
    backBtnPlain: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    body: { padding: 20, gap: 16 },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },

    time: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },

    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
      lineHeight: 34,
    },

    venueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    venueName: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
    venueAddress: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

    description: { fontSize: 15, color: colors.textSecondary, lineHeight: 23 },

    genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    genreTag: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
    },
    genreText: { fontSize: 13, fontWeight: '500' },

    detailCard: {
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 4,
      gap: 0,
    },

    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
    },
    statsText: { fontSize: 13 },

    actions: { gap: 10, marginTop: 4 },
    rsvpBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 15,
      borderRadius: 14,
    },
    rsvpBtnGoing: { backgroundColor: '#16a34a' },
    rsvpBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
    signUpBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 15,
      borderRadius: 14,
    },
    signUpBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
    btnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    manageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1,
    },
    manageBtnText: { fontSize: 15, fontWeight: '700' },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1,
    },
    editBtnText: { fontSize: 15, fontWeight: '600' },
    shareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1,
    },
    shareBtnText: { fontSize: 15, fontWeight: '600' },

    lineupSection: {
      marginTop: 8,
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
    lineupHeading: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      marginBottom: 12,
    },
    lineupEmpty: {
      fontSize: 14,
      fontStyle: 'italic',
    },
    lineupRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    lineupNum: {
      fontSize: 15,
      fontWeight: '800',
      width: 22,
      textAlign: 'center',
      marginTop: 1,
    },
    lineupInfo: { flex: 1, gap: 2 },
    lineupName: { fontSize: 15, fontWeight: '700' },
    lineupDetail: { fontSize: 12 },
    lineupSocials: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    lineupHandle: { fontSize: 12, fontWeight: '600' },
    lineupAvatar: {
      width: 40,
      height: 40,
      borderRadius: 8,
    },
    lineupAvatarFallback: {
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lineupAvatarInitials: {
      fontSize: 13,
      fontWeight: '800',
    },

  });
}

import { useEffect, useState, useCallback } from 'react';
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
  Alert,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../context/ThemeContext';
import { EventTypeBadge } from '../../components/EventTypeBadge';
import { SignUpModal } from '../../components/SignUpModal';
import { EditEventModal } from '../../components/EditEventModal';
import { formatTime } from '../../utils/date';
import { apiClient } from '../../lib/api';
import { useAttending } from '../../context/AttendingContext';
import type { MockEvent } from '../../constants/mock-data';
import type { CreateSignupInput } from '@on-deck/shared';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { isSignedIn, getToken, userId } = useAuth();
  const { attendingIds, addAttending, removeAttending } = useAttending();
  const styles = makeStyles(colors);

  const [event, setEvent] = useState<MockEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [signupCount, setSignupCount] = useState(0);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const rsvped = event ? attendingIds.has(event.id) : false;
  const isHost = isSignedIn && event?.hostId === userId;
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

  async function handleRsvp() {
    if (!event) return;
    const going = !rsvped;
    if (going) {
      addAttending(event);
      setAttendeeCount((c) => c + 1);
    } else {
      removeAttending(event.id);
      setAttendeeCount((c) => Math.max(0, c - 1));
    }
    try {
      const token = await getToken();
      if (!token) return;
      if (going) {
        await apiClient.attendees.rsvp(event.id, token);
      } else {
        await apiClient.attendees.cancel(event.id, token);
      }
    } catch {
      // optimistic — ignore
    }
  }

  async function handleSignUp(input: CreateSignupInput) {
    if (!event) throw new Error('No event');
    const token = await getToken();
    const result = await apiClient.signups.create(event.id, input, token!);
    setSignupCount((c) => c + 1);
    return result;
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCenter}>
          <Text style={[styles.backBtnCenterText, { color: colors.gold }]}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* Hero image */}
        {event.coverImageUrl ? (
          <View style={styles.heroContainer}>
            <Image source={{ uri: event.coverImageUrl }} style={styles.heroImage} resizeMode="cover" />
            {/* Back button over image */}
            <TouchableOpacity style={styles.backBtnOverlay} onPress={() => router.back()} activeOpacity={0.8}>
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtnPlain}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.body}>
          {/* Type badge + time */}
          <View style={styles.metaRow}>
            <EventTypeBadge type={event.type} />
            <Text style={styles.time}>
              {event.startsAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {' · '}{formatTime(event.startsAt)}
              {event.endsAt ? ` – ${formatTime(event.endsAt)}` : ''}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{event.title}</Text>

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

          {/* Genre tags */}
          {event.genres.length > 0 && (
            <View style={styles.genreRow}>
              {event.genres.map((g) => (
                <View key={g} style={[styles.genreTag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.genreText, { color: colors.textSecondary }]}>{g}</Text>
                </View>
              ))}
            </View>
          )}

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
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <Ionicons name="people-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.statsText, { color: colors.textMuted }]}>
              {attendeeCount} going
              {event.signupsEnabled && ` · ${signupCount} signed up`}
              {event.signupsEnabled && slotsLeft !== null && (isFull ? ' · Full' : ` · ${slotsLeft} slots left`)}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            {/* RSVP */}
            <TouchableOpacity
              style={[styles.rsvpBtn, rsvped ? styles.rsvpBtnGoing : { backgroundColor: '#6366f1' }]}
              onPress={isSignedIn ? handleRsvp : () => router.push('/(auth)/sign-in')}
              activeOpacity={0.85}
            >
              <Ionicons name={rsvped ? 'checkmark-circle' : 'add-circle-outline'} size={18} color="#fff" />
              <Text style={styles.rsvpBtnText}>{rsvped ? "I'm Going" : "I'm Going"}</Text>
            </TouchableOpacity>

            {/* Sign up to perform */}
            {event.signupsEnabled && event.signUpMethod !== 'door' && (
              <TouchableOpacity
                style={[styles.signUpBtn, { backgroundColor: accentColor }, isFull && styles.btnDisabled]}
                onPress={isSignedIn ? () => setShowSignUp(true) : () => router.push('/(auth)/sign-in')}
                disabled={isFull}
                activeOpacity={0.85}
              >
                <Ionicons name="mic" size={18} color={isFull ? colors.textMuted : '#fff'} />
                <Text style={[styles.signUpBtnText, isFull && { color: colors.textMuted }]}>
                  {isFull ? 'Full' : 'Sign Up to Perform'}
                </Text>
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
        </View>
      </ScrollView>

      {event && (
        <>
          <SignUpModal
            event={event}
            visible={showSignUp}
            onClose={() => setShowSignUp(false)}
            onSubmit={handleSignUp}
          />
          <EditEventModal
            event={event}
            visible={showEdit}
            onClose={() => setShowEdit(false)}
            onSave={(updated) => setEvent(updated)}
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
    safe: { flex: 1, backgroundColor: colors.bg },
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

    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
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
  });
}

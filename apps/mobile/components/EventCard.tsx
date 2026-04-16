import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../context/ThemeContext';
import { formatDayLabel, formatTime } from '../utils/date';
import { apiClient } from '../lib/api';
import { useAttending } from '../context/AttendingContext';
import type { MockEvent } from '../constants/mock-data';

const EVENT_TYPE_LABEL: Record<string, string> = {
  OPEN_MIC:      'OPEN MIC',
  JAM_SESSION:   'JAM',
  COMEDY_NIGHT:  'COMEDY',
  POETRY_SLAM:   'POETRY',
  OPEN_STAGE:    'OPEN STAGE',
  WORKSHOP:      'WORKSHOP',
  OPEN_STUDIO:   'STUDIO',
};

interface Props {
  event: MockEvent;
}

export function EventCard({ event }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();
  const { attendingIds, addAttending, removeAttending } = useAttending();
  const styles = makeStyles(colors);

  const [attendeeCount, setAttendeeCount] = useState(event.attendeeCount);
  const rsvped = attendingIds.has(event.id);
  const hasImage = !!(event.coverImageUrl || event.coverImageThumb);
  const accentColor = event.type === 'OPEN_MIC' ? colors.gold : colors.jam;

  async function handleRsvp() {
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
      if (!token) throw new Error('Not authenticated');
      if (going) {
        await apiClient.attendees.rsvp(event.id, token);
      } else {
        await apiClient.attendees.cancel(event.id, token);
      }
    } catch {
      if (going) {
        removeAttending(event.id);
        setAttendeeCount((c) => Math.max(0, c - 1));
      } else {
        addAttending(event);
        setAttendeeCount((c) => c + 1);
      }
    }
  }

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => router.push(`/events/${event.id}` as any)}
      accessibilityRole="button"
      accessibilityLabel={`${event.title} at ${event.venue.name}`}
    >
      {/* ── Hero ─────────────────────────────────── */}
      <View style={styles.hero}>
        {hasImage ? (
          <Image
            source={{ uri: event.coverImageUrl ?? event.coverImageThumb }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.surfaceHigh }]} />
        )}

        {/* Gradient overlay — stronger at bottom for text legibility */}
        <LinearGradient
          colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Top row: type pill + date/time */}
        <View style={styles.heroTop}>
          <View style={[styles.typePill, { borderColor: accentColor }]}>
            <Text style={[styles.typePillText, { color: accentColor }]}>
              {EVENT_TYPE_LABEL[event.type] ?? event.type}
            </Text>
          </View>
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>
              {formatDayLabel(event.startsAt).toUpperCase()} · {formatTime(event.startsAt)}
            </Text>
          </View>
        </View>

        {/* Bottom: title + venue */}
        <View style={styles.heroBottom}>
          <Text style={styles.heroTitle} numberOfLines={2}>{event.title}</Text>
          <View style={styles.heroVenueRow}>
            <Ionicons name="location-sharp" size={11} color="rgba(255,255,255,0.55)" />
            <Text style={styles.heroVenue} numberOfLines={1}>
              {event.venue.name}
              {event.venue.neighborhood ? `  ·  ${event.venue.neighborhood}` : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Info strip ────────────────────────────── */}
      <View style={styles.strip}>
        <View style={styles.stripLeft}>
          {event.genres.slice(0, 3).map((g) => (
            <View key={g} style={styles.genrePill}>
              <Text style={styles.genrePillText}>{g}</Text>
            </View>
          ))}
          {event.coverCharge && event.coverCharge !== 'Free' && (
            <View style={styles.genrePill}>
              <Text style={styles.genrePillText}>{event.coverCharge}</Text>
            </View>
          )}
          {(attendeeCount + event.signupCount) > 0 && (
            <View style={styles.goingPill}>
              <Ionicons name="people-outline" size={10} color={colors.textMuted} />
              <Text style={styles.goingText}>{attendeeCount + event.signupCount}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.rsvpBtn, rsvped && { backgroundColor: colors.gold, borderColor: colors.gold }]}
          onPress={isSignedIn ? handleRsvp : () => router.push('/(auth)/sign-in')}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.rsvpText, rsvped && { color: '#fff' }]}>
            {rsvped ? 'GOING' : 'RSVP'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },

    // ── Hero ──────────────────────────────────────
    hero: {
      height: 210,
      justifyContent: 'space-between',
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: 14,
    },
    typePill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      borderWidth: 1,
    },
    typePillText: {
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 1.2,
    },
    datePill: {
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 4,
    },
    datePillText: {
      fontSize: 10,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: 0.4,
    },
    heroBottom: {
      padding: 14,
      gap: 5,
    },
    heroTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.3,
      lineHeight: 26,
    },
    heroVenueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    heroVenue: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.55)',
      fontWeight: '500',
      flex: 1,
    },

    // ── Info strip ───────────────────────────────
    strip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    stripLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      flexWrap: 'wrap',
    },
    genrePill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceHigh,
    },
    genrePillText: {
      fontSize: 10,
      fontWeight: '500',
      color: colors.textSecondary,
      letterSpacing: 0.2,
    },
    goingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    goingText: {
      fontSize: 10,
      color: colors.textMuted,
    },
    rsvpBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.textMuted,
    },
    rsvpText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.8,
    },
  });
}

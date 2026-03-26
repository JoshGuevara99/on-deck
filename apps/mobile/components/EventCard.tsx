import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../context/ThemeContext';
import { EventTypeBadge } from './EventTypeBadge';
import { GenreBadge } from './GenreBadge';
import type { EventGenre } from '@on-deck/shared';
import { formatDayLabel, formatTime } from '../utils/date';
import { apiClient } from '../lib/api';
import { useAttending } from '../context/AttendingContext';
import type { MockEvent } from '../constants/mock-data';

interface Props {
  event: MockEvent;
}

export function EventCard({ event }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();
  const { attendingIds, addAttending, removeAttending } = useAttending();
  const accentColor = event.type === 'OPEN_MIC' ? colors.gold : colors.jam;
  const styles = makeStyles(colors);

  const [attendeeCount, setAttendeeCount] = useState(event.attendeeCount);
  const rsvped = attendingIds.has(event.id);

  async function handleRsvp() {
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

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => router.push(`/events/${event.id}` as any)}
      accessibilityRole="button"
      accessibilityLabel={`${event.title} at ${event.venue.name}`}
    >
      {/* Cover image */}
      {(event.coverImageUrl || event.coverImageThumb) && (
        <Image
          source={{ uri: event.coverImageUrl ?? event.coverImageThumb }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.row}>
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        <View style={styles.content}>
          {/* Badge row: type + genre badges */}
          <View style={styles.badgeRow}>
            <EventTypeBadge type={event.type} />
            {event.genres.map((g) => {
              const known = ['Comedy', 'Music', 'Poetry'];
              if (known.includes(g)) {
                return <GenreBadge key={g} genre={g as EventGenre} />;
              }
              return (
                <View key={g} style={styles.genreTag}>
                  <Text style={styles.genreText}>{g}</Text>
                </View>
              );
            })}
          </View>

          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

          {/* Date + time */}
          <Text style={styles.time}>
            {formatDayLabel(event.startsAt)} · {formatTime(event.startsAt)}
          </Text>

          {/* Venue */}
          <View style={styles.venueRow}>
            <Ionicons name="location-sharp" size={13} color={accentColor} />
            <Text style={styles.venueName} numberOfLines={1}>{event.venue.name}</Text>
            {event.venue.neighborhood ? (
              <>
                <Text style={styles.separator}>·</Text>
                <Text style={styles.neighborhood} numberOfLines={1}>{event.venue.neighborhood}</Text>
              </>
            ) : null}
          </View>

          {/* Footer chips */}
          <View style={styles.footer}>
            {event.isRecurring && event.recurringDescription && (
              <FooterChip icon="repeat" label={event.recurringDescription} color={colors.textMuted} />
            )}
            {event.slotDuration && (
              <FooterChip icon="time-outline" label={event.slotDuration} color={colors.textMuted} />
            )}
            {event.coverCharge && (
              <FooterChip
                icon={event.coverCharge === 'Free' ? 'gift-outline' : 'cash-outline'}
                label={event.coverCharge}
                color={colors.textMuted}
              />
            )}
            <View style={styles.attendeeChip}>
              <Ionicons name="people-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.footerChipText, { color: colors.textMuted }]}>
                {attendeeCount + event.signupCount > 0
                  ? `${attendeeCount + event.signupCount} going`
                  : 'Be first'}
              </Text>
            </View>
            {event.sourceUrl && (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); Linking.openURL(event.sourceUrl!); }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={[styles.footerChipText, { color: colors.textMuted, textDecorationLine: 'underline' }]}>
                  {new URL(event.sourceUrl).hostname.replace(/^www\./, '')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* RSVP button */}
        <View style={styles.rsvpColumn}>
          <TouchableOpacity
            style={[styles.rsvpBtn, rsvped ? styles.rsvpBtnGoing : styles.rsvpBtnDefault]}
            onPress={isSignedIn ? handleRsvp : () => router.push('/(auth)/sign-in')}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={rsvped ? 'checkmark' : 'add'} size={22} color="#fff" />
            <Text style={styles.rsvpBtnLabel}>{rsvped ? 'Going' : 'RSVP'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FooterChip({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={chipStyles.chip}>
      <Ionicons name={icon as any} size={11} color={color} />
      <Text style={[chipStyles.label, { color }]}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontSize: 12 },
});

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceHigh,
      borderRadius: 16,
      marginBottom: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    coverImage: {
      width: '100%',
      height: 160,
    },
    row: {
      flexDirection: 'row',
    },
    accentBar: { width: 4 },
    content: { flex: 1, padding: 14, gap: 8 },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 5,
    },
    time: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
    title: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
      lineHeight: 25,
    },
    venueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
    venueName: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', flexShrink: 1 },
    separator: { color: colors.border, fontSize: 13 },
    neighborhood: { fontSize: 13, color: colors.textMuted, flexShrink: 1 },
    genreTag: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    genreText: { fontSize: 10, color: colors.textSecondary, fontWeight: '500' },
    footer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingTop: 6,
      marginTop: 2,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    attendeeChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    footerChipText: { fontSize: 12 },
    rsvpColumn: {
      width: 64,
      alignItems: 'center',
      justifyContent: 'center',
      paddingRight: 12,
    },
    rsvpBtn: {
      width: 52,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      gap: 3,
    },
    rsvpBtnDefault: {
      backgroundColor: '#6366f1',
      shadowColor: '#6366f1',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.45,
      shadowRadius: 6,
      elevation: 5,
    },
    rsvpBtnGoing: {
      backgroundColor: '#16a34a',
      shadowColor: '#22c55e',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.45,
      shadowRadius: 6,
      elevation: 5,
    },
    rsvpBtnLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 0.3,
    },
  });
}

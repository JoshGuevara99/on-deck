import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../context/ThemeContext';
import { SignUpModal } from './SignUpModal';
import { EditEventModal } from './EditEventModal';
import { formatDayLabel, formatTime } from '../utils/date';
import { apiClient } from '../lib/api';
import type { MockEvent } from '../constants/mock-data';
import type { CreateSignupInput, EventType } from '@on-deck/shared';

interface Props {
  event: MockEvent;
  expanded?: boolean;
  onPress?: () => void;
}

const TYPE_LABELS: Record<EventType, string> = {
  OPEN_MIC:     'Open Mic',
  JAM_SESSION:  'Jam Session',
  COMEDY_NIGHT: 'Comedy Night',
  POETRY_SLAM:  'Poetry Slam',
  OPEN_STAGE:   'Open Stage',
  WORKSHOP:     'Workshop',
  OPEN_STUDIO:  'Open Studio',
};

export function EventCard({ event, expanded = false, onPress }: Props) {
  const { colors } = useTheme();
  const { isSignedIn, getToken, userId } = useAuth();
  const styles = makeStyles(colors);

  const typeColorMap: Record<EventType, string> = {
    OPEN_MIC:     colors.gold,
    JAM_SESSION:  colors.jam,
    COMEDY_NIGHT: colors.cyan,
    POETRY_SLAM:  colors.accent,
    OPEN_STAGE:   colors.gold,
    WORKSHOP:     colors.cyan,
    OPEN_STUDIO:  colors.accent,
  };
  const accentColor = typeColorMap[event.type];

  const [signUpModalVisible, setSignUpModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(event);
  const [attendeeCount, setAttendeeCount] = useState(event.attendeeCount);
  const [signupCount, setSignupCount] = useState(event.signupCount);
  const [rsvped, setRsvped] = useState(false);

  const isHost = isSignedIn && userId === currentEvent.hostId;
  const slotsLeft = event.maxSlots != null ? event.maxSlots - signupCount : null;
  const isFull = slotsLeft !== null && slotsLeft <= 0;
  const totalGoing = attendeeCount + signupCount;

  const hasExpandedContent =
    (event.description && event.description.length > 0) ||
    event.genres.length > 0 ||
    (event.backline && event.backline.length > 0) ||
    event.endsAt ||
    event.venue.instagramHandle ||
    event.signupsEnabled;

  async function handleRsvp() {
    try {
      const token = await getToken();
      if (rsvped) {
        await apiClient.attendees.cancel(currentEvent.id, token!);
        setAttendeeCount((c) => Math.max(0, c - 1));
        setRsvped(false);
      } else {
        await apiClient.attendees.rsvp(currentEvent.id, token!);
        setAttendeeCount((c) => c + 1);
        setRsvped(true);
      }
    } catch {
      // silently ignore
    }
  }

  async function handleSignUp(input: CreateSignupInput) {
    const token = await getToken();
    const result = await apiClient.signups.create(currentEvent.id, input, token!);
    setSignupCount((c) => c + 1);
    return result;
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.card, { borderColor: accentColor, shadowColor: accentColor }]}
        activeOpacity={0.9}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${event.title} at ${event.venue.name}`}
        accessibilityState={{ expanded }}
      >
        {/* ── Type header block ──────────────────────────────── */}
        <View style={[styles.typeHeader, { backgroundColor: accentColor }]}>
          <Text style={styles.typeLabel}>{TYPE_LABELS[event.type]}</Text>
          <View style={styles.typeHeaderRight}>
            <Text style={styles.timeLabel}>
              {formatDayLabel(event.startsAt).toUpperCase()} · {formatTime(event.startsAt)}
            </Text>
            {hasExpandedContent && (
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={13}
                color="rgba(0,0,0,0.5)"
              />
            )}
          </View>
        </View>

        {/* ── Body ───────────────────────────────────────────── */}
        <View style={styles.body}>
          {/* Title */}
          <Text style={styles.title} numberOfLines={expanded ? undefined : 2}>
            {event.title}
          </Text>

          {/* Venue */}
          <Text style={styles.venue}>
            {event.venue.name}
            {event.venue.neighborhood ? `  ·  ${event.venue.neighborhood}` : ''}
          </Text>

          {/* Single meta row: cover · slot · N going */}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{event.coverCharge}</Text>
            {event.slotDuration ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>{event.slotDuration} slots</Text>
              </>
            ) : null}
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>
              {totalGoing > 0 ? `${totalGoing} going` : 'No RSVPs yet'}
            </Text>
          </View>

          {/* Genre hashtags */}
          {event.genres.length > 0 && (
            <Text style={styles.genres} numberOfLines={expanded ? undefined : 1}>
              {(expanded ? event.genres : event.genres.slice(0, 5))
                .map((g) => `#${g.toLowerCase().replace(/\s+/g, '')}`)
                .join('  ')}
              {!expanded && event.genres.length > 5 ? `  +${event.genres.length - 5}` : ''}
            </Text>
          )}

          {/* Description — expanded only */}
          {expanded && event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : null}

          {/* ── Sign-up section (expanded) ─────────────────── */}
          {expanded && event.signupsEnabled && (
            <View style={styles.signupSection}>
              {/* Slot counts */}
              <View style={styles.countsRow}>
                {attendeeCount > 0 && (
                  <View style={styles.countChip}>
                    <Ionicons name="people-outline" size={12} color={accentColor} />
                    <Text style={[styles.countChipText, { color: accentColor }]}>{attendeeCount} going</Text>
                  </View>
                )}
                {signupCount > 0 && (
                  <View style={styles.countChip}>
                    <Ionicons name="mic-outline" size={12} color={accentColor} />
                    <Text style={[styles.countChipText, { color: accentColor }]}>{signupCount} performing</Text>
                  </View>
                )}
                {slotsLeft !== null && (
                  <View style={styles.countChip}>
                    <Ionicons
                      name={isFull ? 'lock-closed-outline' : 'ellipse-outline'}
                      size={12}
                      color={isFull ? colors.jam : accentColor}
                    />
                    <Text style={[styles.countChipText, { color: isFull ? colors.jam : accentColor }]}>
                      {isFull ? 'Full' : `${slotsLeft} left`}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { borderColor: accentColor },
                    rsvped && { backgroundColor: accentColor },
                    !isSignedIn && styles.actionBtnDisabled,
                  ]}
                  onPress={handleRsvp}
                  disabled={!isSignedIn}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={rsvped ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={15}
                    color={!isSignedIn ? colors.textMuted : rsvped ? '#000' : accentColor}
                  />
                  <Text style={[
                    styles.actionBtnText,
                    { color: !isSignedIn ? colors.textMuted : rsvped ? '#000' : accentColor },
                  ]}>
                    {rsvped ? 'Going ✓' : "I'm Going"}
                  </Text>
                </TouchableOpacity>

                {currentEvent.signUpMethod !== 'door' && (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { borderColor: accentColor, backgroundColor: accentColor },
                      (isFull || !isSignedIn) && styles.actionBtnDisabled,
                    ]}
                    onPress={() => setSignUpModalVisible(true)}
                    disabled={isFull || !isSignedIn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="mic" size={15} color={(isFull || !isSignedIn) ? colors.textMuted : '#000'} />
                    <Text style={[styles.actionBtnText, { color: (isFull || !isSignedIn) ? colors.textMuted : '#000' }]}>
                      {isFull ? 'Full' : 'Sign Up'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {!isSignedIn && (
                <Text style={styles.signInHint}>
                  — Sign in to RSVP or grab a slot
                </Text>
              )}
            </View>
          )}

          {/* ── Expanded details ───────────────────────────── */}
          {expanded && (
            <View style={styles.expandedSection}>
              {isHost && (
                <TouchableOpacity
                  style={[styles.editBtn, { borderColor: accentColor }]}
                  onPress={() => setEditModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={14} color={accentColor} />
                  <Text style={[styles.editBtnText, { color: accentColor }]}>Edit Event</Text>
                </TouchableOpacity>
              )}

              <View style={styles.detailGrid}>
                <DetailItem label="Time" value={`${formatTime(event.startsAt)}${event.endsAt ? ` – ${formatTime(event.endsAt)}` : ''}`} />
                <DetailItem label="Address" value={event.venue.address} />
                <DetailItem
                  label="Sign-up"
                  value={event.signUpMethod === 'door' ? 'At the door' : event.signUpMethod === 'online' ? 'Online' : 'Via app'}
                />
                {event.slotDuration && <DetailItem label="Slot" value={event.slotDuration} />}
                <DetailItem label="Cover" value={event.coverCharge} />
                {event.backline && event.backline.length > 0 && (
                  <DetailItem label="Backline" value={event.backline.join(', ')} />
                )}
                {event.isRecurring && event.recurringDescription && (
                  <DetailItem label="Recurring" value={event.recurringDescription} />
                )}
              </View>

              {event.venue.instagramHandle && (
                <TouchableOpacity
                  style={styles.instaRow}
                  onPress={() => {
                    const handle = event.venue.instagramHandle!.replace(/^@/, '');
                    Linking.openURL(`https://instagram.com/${handle}`);
                  }}
                >
                  <Ionicons name="logo-instagram" size={14} color="#E1306C" />
                  <Text style={styles.instaText}>
                    {event.venue.instagramHandle.startsWith('@')
                      ? event.venue.instagramHandle
                      : `@${event.venue.instagramHandle}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>

      <SignUpModal
        event={currentEvent}
        visible={signUpModalVisible}
        onClose={() => setSignUpModalVisible(false)}
        onSubmit={handleSignUp}
      />
      <EditEventModal
        event={currentEvent}
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSave={(updated) => setCurrentEvent(updated)}
      />
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={detailStyles.row}>
      <Text style={[detailStyles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[detailStyles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingVertical: 5 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', width: 68, flexShrink: 0 },
  value: { fontSize: 13, flex: 1, lineHeight: 18 },
});

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      flexDirection: 'column',
      backgroundColor: colors.surface,
      borderRadius: 2,
      marginBottom: 20,
      overflow: 'hidden',
      borderWidth: 2,
      // borderColor + shadowColor passed inline per event type
      shadowOffset: { width: 5, height: 5 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 6,
    },
    typeHeader: {
      paddingHorizontal: 14,
      paddingVertical: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    typeLabel: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.8,
      textTransform: 'uppercase',
      color: 'rgba(0,0,0,0.75)',
    },
    typeHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    timeLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: 'rgba(0,0,0,0.55)',
    },
    body: {
      padding: 16,
      gap: 9,
    },
    title: {
      fontSize: 26,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -1,
      lineHeight: 31,
    },
    venue: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
      letterSpacing: 0.1,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 5,
    },
    metaText: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '600',
    },
    metaDot: {
      fontSize: 12,
      color: colors.border,
      fontWeight: '400',
    },
    genres: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500',
      letterSpacing: 0.2,
      lineHeight: 20,
    },
    description: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 21,
      paddingTop: 4,
    },
    signupSection: {
      gap: 10,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 4,
    },
    countsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    countChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceHigh,
      borderWidth: 1,
      borderColor: colors.border,
    },
    countChipText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 2,
      borderWidth: 2,
      backgroundColor: 'transparent',
    },
    actionBtnDisabled: {
      borderColor: colors.border,
      backgroundColor: 'transparent',
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    signInHint: {
      fontSize: 11,
      color: colors.textMuted,
      fontStyle: 'italic',
      textAlign: 'center',
    },
    expandedSection: {
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 4,
      gap: 4,
    },
    detailGrid: {
      gap: 0,
    },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 2,
      borderWidth: 1.5,
      marginBottom: 8,
    },
    editBtnText: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    instaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingTop: 8,
    },
    instaText: {
      fontSize: 13,
      color: '#E1306C',
      fontWeight: '600',
    },
  });
}

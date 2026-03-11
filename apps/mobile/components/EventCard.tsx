import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../context/ThemeContext';
import { EventTypeBadge } from './EventTypeBadge';
import { SignUpModal } from './SignUpModal';
import { EditEventModal } from './EditEventModal';
import { formatDayLabel, formatTime } from '../utils/date';
import { apiClient } from '../lib/api';
import { useAttending } from '../context/AttendingContext';
import type { MockEvent } from '../constants/mock-data';
import type { CreateSignupInput } from '@on-deck/shared';

interface Props {
  event: MockEvent;
  expanded?: boolean;
  onPress?: () => void;
}

export function EventCard({ event, expanded = false, onPress }: Props) {
  const { colors } = useTheme();
  const { isSignedIn, getToken, userId } = useAuth();
  const { attendingIds, addAttending, removeAttending } = useAttending();
  const accentColor = event.type === 'OPEN_MIC' ? colors.gold : colors.jam;
  const styles = makeStyles(colors);

  const [signUpModalVisible, setSignUpModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(event);
  const [attendeeCount, setAttendeeCount] = useState(event.attendeeCount);
  const [signupCount, setSignupCount] = useState(event.signupCount);

  // Derived from global context — persists across navigation and page refresh
  const rsvped = attendingIds.has(currentEvent.id);

  const isHost = isSignedIn && userId === currentEvent.hostId;

  const slotsLeft = event.maxSlots != null ? event.maxSlots - signupCount : null;
  const isFull = slotsLeft !== null && slotsLeft <= 0;

  const hasExpandedContent = true; // every event is expandable for the "I'm Going" button

  async function handleRsvp() {
    const going = !rsvped;
    // Update global context immediately — reflects across all tabs
    if (going) {
      addAttending(currentEvent);
      setAttendeeCount((c) => c + 1);
    } else {
      removeAttending(currentEvent.id);
      setAttendeeCount((c) => Math.max(0, c - 1));
    }
    try {
      const token = await getToken();
      if (!token) return;
      if (going) {
        await apiClient.attendees.rsvp(currentEvent.id, token);
      } else {
        await apiClient.attendees.cancel(currentEvent.id, token);
      }
    } catch {
      // silently ignore — keep the optimistic UI state
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
        style={styles.card}
        activeOpacity={0.85}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${event.title} at ${event.venue.name}`}
        accessibilityState={{ expanded }}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        <View style={styles.content}>
          {/* Badge + time + expand indicator */}
          <View style={styles.headerRow}>
            <EventTypeBadge type={event.type} />
            <View style={styles.headerRight}>
              <Text style={styles.time}>
                {formatDayLabel(event.startsAt)} · {formatTime(event.startsAt)}
              </Text>
              {hasExpandedContent && (
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.textMuted}
                  style={styles.chevron}
                />
              )}
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Venue */}
          <View style={styles.venueRow}>
            <Ionicons name="location-sharp" size={13} color={accentColor} />
            <Text style={styles.venueName}>{event.venue.name}</Text>
            {event.venue.neighborhood ? (
              <>
                <Text style={styles.separator}>·</Text>
                <Text style={styles.neighborhood}>{event.venue.neighborhood}</Text>
              </>
            ) : null}
          </View>

          {/* Genre tags */}
          <View style={styles.genreRow}>
            {(expanded ? event.genres : event.genres.slice(0, 3)).map((g) => (
              <View key={g} style={styles.genreTag}>
                <Text style={styles.genreText}>{g}</Text>
              </View>
            ))}
            {!expanded && event.genres.length > 3 && (
              <View style={[styles.genreTag, { borderStyle: 'dashed' }]}>
                <Text style={styles.genreText}>+{event.genres.length - 3}</Text>
              </View>
            )}
          </View>

          {/* Attendee count */}
          <View style={styles.attendeeRow}>
            <Ionicons name="people-outline" size={13} color={colors.textMuted} />
            <Text style={styles.attendeeText}>
              {attendeeCount + signupCount > 0 ? `${attendeeCount + signupCount} going` : 'No RSVPs yet'}
            </Text>
          </View>

          {/* Description */}
          {event.description ? (
            <Text style={styles.description} numberOfLines={expanded ? undefined : 2}>
              {event.description}
            </Text>
          ) : null}

          {/* ── Sign-up section (expanded only) ──────────────────────── */}
          {expanded && (
            <View style={styles.signupSection}>
              {/* Counts row — only when signups are enabled */}
              {event.signupsEnabled && (
                <View style={styles.countsRow}>
                  {attendeeCount > 0 && (
                    <View style={styles.countItem}>
                      <Ionicons name="people-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.countText}>{attendeeCount} going</Text>
                    </View>
                  )}
                  {signupCount > 0 && (
                    <View style={styles.countItem}>
                      <Ionicons name="mic-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.countText}>{signupCount} signed up</Text>
                    </View>
                  )}
                  {slotsLeft !== null && (
                    <View style={styles.countItem}>
                      <Ionicons
                        name={isFull ? 'lock-closed-outline' : 'ellipse-outline'}
                        size={13}
                        color={isFull ? colors.jam : colors.textMuted}
                      />
                      <Text style={[styles.countText, isFull && { color: colors.jam }]}>
                        {isFull ? 'Full' : `${slotsLeft} left`}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Sign Up to Perform — only in expanded view */}
              {event.signupsEnabled && currentEvent.signUpMethod !== 'door' && (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.actionBtnPrimary,
                    (isFull || !isSignedIn) && styles.actionBtnDisabled,
                  ]}
                  onPress={() => setSignUpModalVisible(true)}
                  disabled={isFull || !isSignedIn}
                  activeOpacity={0.85}
                >
                  <Ionicons name="mic" size={15} color={(isFull || !isSignedIn) ? colors.textMuted : colors.bg} />
                  <Text style={[styles.actionBtnPrimaryText, (isFull || !isSignedIn) && { color: colors.textMuted }]}>
                    {isFull ? 'Full' : 'Sign Up to Perform'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Sign-in hint */}
              {!isSignedIn && (
                <View style={styles.signInHint}>
                  <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.signInHintText}>Sign in to RSVP or grab a performer slot</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Expanded details ─────────────────────────────── */}
          {expanded && (
            <View style={styles.expandedSection}>
              {/* Host edit button */}
              {isHost && (
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setEditModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={15} color={colors.gold} />
                  <Text style={styles.editBtnText}>Edit Event</Text>
                </TouchableOpacity>
              )}
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={14} color={accentColor} />
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>
                  {formatTime(event.startsAt)}
                  {event.endsAt ? ` – ${formatTime(event.endsAt)}` : ''}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="map-outline" size={14} color={accentColor} />
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue}>{event.venue.address}</Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="hand-left-outline" size={14} color={accentColor} />
                <Text style={styles.detailLabel}>Sign up</Text>
                <Text style={styles.detailValue}>
                  {event.signUpMethod === 'door'
                    ? 'At the door'
                    : event.signUpMethod === 'online'
                    ? 'Online'
                    : 'Via app'}
                </Text>
              </View>

              {event.slotDuration && (
                <View style={styles.detailRow}>
                  <Ionicons name="hourglass-outline" size={14} color={accentColor} />
                  <Text style={styles.detailLabel}>Slot</Text>
                  <Text style={styles.detailValue}>{event.slotDuration}</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Ionicons
                  name={event.coverCharge === 'Free' ? 'gift-outline' : 'cash-outline'}
                  size={14}
                  color={accentColor}
                />
                <Text style={styles.detailLabel}>Cover</Text>
                <Text style={styles.detailValue}>{event.coverCharge}</Text>
              </View>

              {event.backline && event.backline.length > 0 && (
                <View style={styles.detailRow}>
                  <Ionicons name="musical-notes-outline" size={14} color={accentColor} />
                  <Text style={styles.detailLabel}>Backline</Text>
                  <Text style={styles.detailValue}>{event.backline.join(', ')}</Text>
                </View>
              )}

              {event.isRecurring && event.recurringDescription && (
                <View style={styles.detailRow}>
                  <Ionicons name="repeat" size={14} color={accentColor} />
                  <Text style={styles.detailLabel}>Recurring</Text>
                  <Text style={styles.detailValue}>{event.recurringDescription}</Text>
                </View>
              )}

              {event.venue.instagramHandle && (
                <TouchableOpacity
                  style={styles.detailRow}
                  onPress={() => {
                    const handle = event.venue.instagramHandle!.replace(/^@/, '');
                    Linking.openURL(`https://instagram.com/${handle}`);
                  }}
                  accessibilityLabel={`Open ${event.venue.name} on Instagram`}
                >
                  <Ionicons name="logo-instagram" size={14} color={accentColor} />
                  <Text style={styles.detailLabel}>Instagram</Text>
                  <Text style={[styles.detailValue, styles.link]}>
                    {event.venue.instagramHandle.startsWith('@')
                      ? event.venue.instagramHandle
                      : `@${event.venue.instagramHandle}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Footer chips — collapsed only */}
          {!expanded && (
            <View style={styles.footer}>
              {event.isRecurring && event.recurringDescription && (
                <FooterChip icon="repeat" label={event.recurringDescription} color={colors.textMuted} />
              )}
              {event.slotDuration && (
                <FooterChip icon="time-outline" label={event.slotDuration} color={colors.textMuted} />
              )}
              <FooterChip
                icon={event.coverCharge === 'Free' ? 'gift-outline' : 'cash-outline'}
                label={event.coverCharge}
                color={colors.textMuted}
              />
              {event.signUpMethod === 'door' && !event.signupsEnabled && (
                <FooterChip icon="hand-left-outline" label="Sign up at door" color={colors.textMuted} />
              )}
            </View>
          )}
        </View>

        {/* ── RSVP button — right column, always visible ─── */}
        <View style={styles.rsvpColumn}>
          <TouchableOpacity
            style={[styles.rsvpBtn, rsvped ? styles.rsvpBtnGoing : styles.rsvpBtnDefault, !isSignedIn && styles.rsvpBtnLocked]}
            onPress={isSignedIn ? handleRsvp : undefined}
            activeOpacity={0.8}
          >
            <Ionicons
              name={rsvped ? 'checkmark' : 'add'}
              size={22}
              color={!isSignedIn ? colors.textMuted : '#fff'}
            />
            <Text style={[styles.rsvpBtnLabel, !isSignedIn && { color: colors.textMuted }]}>
              {rsvped ? 'Going' : 'RSVP'}
            </Text>
          </TouchableOpacity>
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
      flexDirection: 'row',
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
    accentBar: { width: 4 },
    content: { flex: 1, padding: 16, gap: 10 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    time: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
    chevron: { marginLeft: 2 },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
      lineHeight: 26,
    },
    venueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
    venueName: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
    separator: { color: colors.border, fontSize: 14 },
    neighborhood: { fontSize: 14, color: colors.textMuted },
    genreRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    genreTag: {
      paddingHorizontal: 9,
      paddingVertical: 3,
      backgroundColor: colors.surface,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    genreText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
    attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    attendeeText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
    description: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
    signupSection: {
      gap: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    countsRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
    countItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    countText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
    actionRow: { flexDirection: 'row', gap: 8 },
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
    rsvpBtnLocked: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    rsvpBtnLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 0.3,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 9,
      borderRadius: 8,
      borderWidth: 1,
    },
    actionBtnSecondary: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    actionBtnActive: {
      backgroundColor: '#22c55e',
      borderColor: '#22c55e',
    },
    actionBtnPrimary: {
      backgroundColor: colors.jam,
      borderColor: colors.jam,
    },
    actionBtnDisabled: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    actionBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    actionBtnTextActive: { color: colors.bg },
    actionBtnPrimaryText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.bg,
    },
    signInHint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingTop: 4,
    },
    signInHintText: {
      fontSize: 11,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    expandedSection: {
      gap: 10,
      paddingTop: 10,
      marginTop: 2,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.gold,
      backgroundColor: colors.surface,
    },
    editBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.gold,
    },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    detailLabel: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: '500',
      width: 72,
      flexShrink: 0,
    },
    detailValue: { fontSize: 13, color: colors.text, flex: 1, lineHeight: 18 },
    link: { color: '#E1306C', fontWeight: '600' },
    footer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      paddingTop: 10,
      marginTop: 2,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
}

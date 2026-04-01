import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { apiClient } from '../../lib/api';
import type { MockEvent } from '../../constants/mock-data';
import type { PerformerType } from '@on-deck/shared';

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<string, string> = {
  OPEN_MIC: 'Open Mic',
  JAM_SESSION: 'Jam Session',
  COMEDY_NIGHT: 'Comedy Night',
  POETRY_SLAM: 'Poetry Slam',
  OPEN_STAGE: 'Open Stage',
  WORKSHOP: 'Workshop',
  OPEN_STUDIO: 'Open Studio',
};

const PERFORMER_TYPES: { value: PerformerType; label: string }[] = [
  { value: 'MUSICIAN',    label: 'Musician' },
  { value: 'COMEDIAN',    label: 'Comedian' },
  { value: 'POET',        label: 'Poet' },
  { value: 'STORYTELLER', label: 'Storyteller' },
  { value: 'OTHER',       label: 'Other' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseApiError(err: unknown): string {
  const msg = (err as any)?.message ?? '';
  const match = msg.match(/→ (\d+): (.*)$/s);
  if (!match) return 'Something went wrong. Please try again.';
  const status = parseInt(match[1], 10);
  try {
    const body = JSON.parse(match[2]);
    if (status === 409) return body.error ?? 'Already signed up or event is full.';
    if (status === 429) return 'Too many attempts. Please wait a few minutes.';
    return body.error ?? 'Something went wrong. Please try again.';
  } catch {
    return 'Something went wrong. Please try again.';
  }
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ icon, text, colors }: { icon: string; text: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
      <Ionicons name={icon as any} size={15} color={colors.textMuted} style={{ marginRight: 8, marginTop: 2 }} />
      <Text style={{ flex: 1, fontSize: 15, lineHeight: 22, color: colors.textSecondary }}>{text}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PublicEventPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const [event, setEvent] = useState<MockEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Signup form
  const [name, setName] = useState('');
  const [performerType, setPerformerType] = useState<PerformerType | null>(null);
  const [instagram, setInstagram] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ slotPosition: number } | null>(null);
  // Track local signup count so the slot bar updates after the user signs up
  const [signupCount, setSignupCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    apiClient.events.getById(id)
      .then((ev) => {
        setEvent(ev);
        setSignupCount(ev.signupCount);
      })
      .catch((err) => {
        if ((err as any)?.message?.includes('404')) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSignUp() {
    if (!event || !name.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await apiClient.signups.create(event.id, {
        guestName: name.trim(),
        performerType: performerType ?? undefined,
        instagramHandle: instagram.replace('@', '').trim() || undefined,
      });
      setConfirmed({ slotPosition: result.slotPosition });
      setSignupCount((c) => c + 1);
    } catch (err) {
      setSubmitError(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const s = makeStyles(colors);

  if (loading) {
    return (
      <View style={[s.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (notFound || !event) {
    return (
      <View style={[s.centered, { backgroundColor: colors.bg }]}>
        <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
        <Text style={[s.notFoundTitle, { color: colors.text }]}>Event not found</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted }}>This event may have been removed.</Text>
      </View>
    );
  }

  const isFull = event.maxSlots != null && signupCount >= event.maxSlots;
  const showForm = event.signupsEnabled && event.signUpMethod !== 'door' && !isFull;
  const showDoor = !event.signupsEnabled || event.signUpMethod === 'door';

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={s.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      {event.coverImageUrl ? (
        <Image source={{ uri: event.coverImageUrl }} style={s.hero} resizeMode="cover" />
      ) : (
        <View style={[s.hero, s.heroFallback, { backgroundColor: colors.surface }]}>
          <Ionicons name="musical-notes-outline" size={52} color={colors.gold} />
        </View>
      )}

      <View style={s.content}>
        {/* Type badge */}
        <View style={[s.badge, { backgroundColor: `${colors.gold}22` }]}>
          <Text style={[s.badgeText, { color: colors.gold }]}>
            {EVENT_TYPE_LABELS[event.type] ?? event.type}
          </Text>
        </View>

        {/* Title */}
        <Text style={[s.title, { color: colors.text }]}>{event.title}</Text>

        {/* Detail card */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <DetailRow icon="calendar-outline" text={fmtDate(event.startsAt)} colors={colors} />
          <DetailRow icon="time-outline"     text={fmtTime(event.startsAt)} colors={colors} />
          <DetailRow
            icon="location-outline"
            text={[event.venue.name, event.venue.neighborhood].filter(Boolean).join(' · ')}
            colors={colors}
          />
          <DetailRow icon="cash-outline" text={event.coverCharge} colors={colors} />
          {event.slotDuration && (
            <DetailRow icon="mic-outline" text={`${event.slotDuration} per performer`} colors={colors} />
          )}
          {event.isRecurring && event.recurringDescription && (
            <DetailRow icon="repeat-outline" text={event.recurringDescription} colors={colors} />
          )}
        </View>

        {/* Description */}
        {!!event.description && (
          <Text style={[s.description, { color: colors.textSecondary }]}>{event.description}</Text>
        )}

        {/* ── Signup section ── */}
        <View style={[s.signupSection, { borderTopColor: colors.border }]}>

          {showDoor ? (
            <View style={s.callout}>
              <Ionicons name="hand-right-outline" size={30} color={colors.gold} />
              <Text style={[s.calloutTitle, { color: colors.text }]}>Sign up at the door</Text>
              <Text style={[s.calloutSub, { color: colors.textMuted }]}>Arrive early to get on the list.</Text>
            </View>

          ) : isFull ? (
            <View style={s.callout}>
              <Ionicons name="people-outline" size={30} color={colors.textMuted} />
              <Text style={[s.calloutTitle, { color: colors.text }]}>Lineup is full</Text>
              <Text style={[s.calloutSub, { color: colors.textMuted }]}>
                All {event.maxSlots} slots are taken. Check back or sign up at the door.
              </Text>
            </View>

          ) : confirmed ? (
            <View style={s.confirmed}>
              <View style={[s.confirmedBadge, { backgroundColor: `${colors.gold}22` }]}>
                <Text style={[s.confirmedNum, { color: colors.gold }]}>#{confirmed.slotPosition}</Text>
              </View>
              <Text style={[s.confirmedTitle, { color: colors.text }]}>You're on the list!</Text>
              <Text style={[s.confirmedSub, { color: colors.textMuted }]}>
                Slot #{confirmed.slotPosition} · {event.venue.name} · {fmtDate(event.startsAt)}
              </Text>
            </View>

          ) : (
            <>
              {/* Slot progress bar */}
              {event.maxSlots != null && (
                <View style={s.slotRow}>
                  <View style={[s.slotTrack, { backgroundColor: colors.surfaceHigh }]}>
                    <View style={[
                      s.slotFill,
                      { backgroundColor: colors.gold, width: `${Math.min((signupCount / event.maxSlots) * 100, 100)}%` as any }
                    ]} />
                  </View>
                  <Text style={[s.slotLabel, { color: colors.textMuted }]}>
                    {signupCount} / {event.maxSlots} slots filled
                  </Text>
                </View>
              )}

              <Text style={[s.formTitle, { color: colors.text }]}>Sign up to perform</Text>

              {/* Name */}
              <TextInput
                style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Your name *"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
              />

              {/* Performer type chips */}
              <View style={s.chips}>
                {PERFORMER_TYPES.map(({ value, label }) => {
                  const active = performerType === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      onPress={() => setPerformerType(active ? null : value)}
                      activeOpacity={0.7}
                      style={[
                        s.chip,
                        {
                          borderColor: active ? colors.gold : colors.border,
                          backgroundColor: active ? `${colors.gold}18` : colors.surface,
                        },
                      ]}
                    >
                      <Text style={[s.chipText, { color: active ? colors.gold : colors.textSecondary }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Instagram */}
              <TextInput
                style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="@instagram (optional)"
                placeholderTextColor={colors.textMuted}
                value={instagram}
                onChangeText={setInstagram}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {submitError && (
                <Text style={[s.error, { color: '#ef4444' }]}>{submitError}</Text>
              )}

              <TouchableOpacity
                style={[s.submitBtn, { backgroundColor: colors.gold, opacity: !name.trim() || submitting ? 0.5 : 1 }]}
                onPress={handleSignUp}
                disabled={!name.trim() || submitting}
                activeOpacity={0.8}
              >
                {submitting
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={s.submitBtnText}>Sign Up to Perform</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Image attribution */}
        {!!event.coverImageAttribution && (
          <Text style={[s.attribution, { color: colors.textMuted }]}>{event.coverImageAttribution}</Text>
        )}

        <Text style={[s.footer, { color: colors.textMuted }]}>ON DECK</Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: any) {
  return StyleSheet.create({
    centered:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    notFoundTitle: { fontSize: 20, fontWeight: '700' },
    container:     { paddingBottom: 56 },
    hero:          { width: '100%', height: 260 },
    heroFallback:  { alignItems: 'center', justifyContent: 'center' },
    content:       { paddingHorizontal: 20, paddingTop: 4, maxWidth: 600, alignSelf: 'center', width: '100%' },
    badge:         { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 18, marginBottom: 10 },
    badgeText:     { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
    title:         { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, lineHeight: 32, marginBottom: 16 },
    card:          { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
    description:   { fontSize: 15, lineHeight: 24, marginBottom: 24 },
    signupSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 24 },
    callout:       { alignItems: 'center', gap: 8, paddingVertical: 28 },
    calloutTitle:  { fontSize: 18, fontWeight: '700' },
    calloutSub:    { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    confirmed:     { alignItems: 'center', gap: 10, paddingVertical: 28 },
    confirmedBadge:{ width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
    confirmedNum:  { fontSize: 30, fontWeight: '900' },
    confirmedTitle:{ fontSize: 22, fontWeight: '800' },
    confirmedSub:  { fontSize: 14, textAlign: 'center', lineHeight: 21 },
    slotRow:       { marginBottom: 18 },
    slotTrack:     { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
    slotFill:      { height: '100%', borderRadius: 2 },
    slotLabel:     { fontSize: 13 },
    formTitle:     { fontSize: 18, fontWeight: '700', marginBottom: 14 },
    input:         { height: 48, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, marginBottom: 12 },
    chips:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    chipText:      { fontSize: 13, fontWeight: '600' },
    error:         { fontSize: 14, marginBottom: 10 },
    submitBtn:     { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    submitBtnText: { fontSize: 16, fontWeight: '800', color: '#000', letterSpacing: 0.2 },
    attribution:   { fontSize: 11, textAlign: 'center', marginTop: 32 },
    footer:        { fontSize: 11, fontWeight: '800', letterSpacing: 3, textAlign: 'center', marginTop: 8 },
  });
}

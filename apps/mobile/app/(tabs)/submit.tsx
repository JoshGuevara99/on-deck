import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  useWindowDimensions,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { UnsplashPickerModal } from '../../components/UnsplashPickerModal';
import type { UnsplashPhoto } from '@on-deck/shared';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../context/ThemeContext';
import { useEvents } from '../../context/EventsContext';
import type { EventType, CreateEventInput } from '@on-deck/shared';
import type { MockEvent } from '../../constants/mock-data';

const GOLD_TYPES = new Set<EventType>(['OPEN_MIC', 'JAM_SESSION', 'OPEN_STAGE']);

const EVENT_TYPE_QUERIES: Record<EventType, string> = {
  OPEN_MIC: 'open mic performance stage',
  JAM_SESSION: 'jazz jam session music',
  COMEDY_NIGHT: 'comedy show stand up',
  POETRY_SLAM: 'poetry spoken word',
  OPEN_STAGE: 'live music stage performance',
  WORKSHOP: 'art workshop creative',
  OPEN_STUDIO: 'art studio creative',
};

const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'OPEN_MIC',     label: 'Open Mic' },
  { value: 'JAM_SESSION',  label: 'Jam Session' },
  { value: 'COMEDY_NIGHT', label: 'Comedy Night' },
  { value: 'POETRY_SLAM',  label: 'Poetry Slam' },
  { value: 'OPEN_STAGE',   label: 'Open Stage' },
  { value: 'WORKSHOP',     label: 'Workshop' },
  { value: 'OPEN_STUDIO',  label: 'Open Studio' },
];

interface FormState {
  title: string;
  venueName: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  date: string;
  startTime: string;
  coverCharge: string;
  slotDuration: string;
  backline: string;
  description: string;
}

interface FormErrors {
  title?: string;
  venueName?: string;
  address?: string;
  city?: string;
  state?: string;
  date?: string;
  startTime?: string;
}

const INITIAL_FORM: FormState = {
  title: '',
  venueName: '',
  address: '',
  neighborhood: '',
  city: '',
  state: '',
  date: '',
  startTime: '',
  coverCharge: '',
  slotDuration: '',
  backline: '',
  description: '',
};

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.title.trim()) errors.title = 'Event title is required';
  if (!form.venueName.trim()) errors.venueName = 'Venue name is required';
  if (!form.address.trim()) errors.address = 'Address is required';
  if (!form.city.trim()) errors.city = 'City is required';
  if (!form.state.trim()) errors.state = 'State is required';
  if (!form.date.trim()) errors.date = 'Date is required';
  if (!form.startTime.trim()) errors.startTime = 'Start time is required';
  return errors;
}

/** Convert free-text date + time into an ISO-8601 string. Falls back to tonight at 8 PM. */
function toIso(dateStr: string, timeStr: string): string {
  const combined = `${dateStr} ${timeStr}`;
  const parsed = new Date(combined);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();

  const fallback = new Date();
  fallback.setHours(20, 0, 0, 0);
  return fallback.toISOString();
}

function buildCreateInput(
  eventType: EventType,
  form: FormState,
  signupsEnabled: boolean,
  maxSlots: string,
  photo: UnsplashPhoto | null,
): CreateEventInput {
  const isRecurring = /every/i.test(form.date);
  return {
    title: form.title.trim(),
    type: eventType,
    startsAt: toIso(form.date, form.startTime),
    description: form.description.trim() || undefined,
    genres: [],
    coverCharge: form.coverCharge.trim() || 'Free',
    slotDuration: form.slotDuration.trim() || undefined,
    backline: form.backline.trim() ? [form.backline.trim()] : [],
    signUpMethod: signupsEnabled ? 'APP' : 'DOOR',
    isRecurring,
    recurringDescription: isRecurring ? form.date.trim() : undefined,
    signupsEnabled,
    maxSlots: signupsEnabled && maxSlots.trim() ? parseInt(maxSlots.trim(), 10) : undefined,
    venue: {
      name: form.venueName.trim(),
      address: form.address.trim(),
      neighborhood: form.neighborhood.trim() || undefined,
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
    },
    coverImageUrl: photo?.url,
    coverImageThumb: photo?.thumb,
    coverImagePhotographer: photo?.photographer,
    coverImagePhotographerUrl: photo?.photographerUrl,
    coverImageAttribution: photo ? `Photo by ${photo.photographer} on Unsplash` : undefined,
  };
}

// ─── Success screen ──────────────────────────────────────────────────────────

interface SuccessProps {
  event: MockEvent;
  onSubmitAnother: () => void;
  onGoToDiscover: () => void;
}

function SuccessScreen({ event, onSubmitAnother, onGoToDiscover }: SuccessProps) {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => makeSuccessStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark-circle" size={64} color={colors.gold} />
        </View>

        <Text style={styles.heading}>Event Submitted!</Text>
        <Text style={styles.sub}>
          Your event has been added to Discover right away.
        </Text>

        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <View style={styles.eventMeta}>
            <Ionicons name="location-sharp" size={13} color={colors.gold} />
            <Text style={styles.eventVenue}>{event.venue.name}</Text>
          </View>
          <Text style={styles.eventType}>
            {event.type === 'OPEN_MIC' ? 'Open Mic' : 'Jam Session'}
            {event.coverCharge ? ` · ${event.coverCharge}` : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.gold }]}
          onPress={onGoToDiscover}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="View in Discover"
        >
          <Ionicons name="compass" size={18} color={colors.bg} />
          <Text style={[styles.primaryBtnText, { color: colors.bg }]}>View in Discover</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={onSubmitAnother}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Submit another event"
        >
          <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
            Submit another event
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function makeSuccessStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 16,
    },
    iconCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: `${colors.gold}18`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    heading: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    sub: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    eventCard: {
      width: '100%',
      backgroundColor: colors.surfaceHigh,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      gap: 6,
      marginVertical: 8,
    },
    eventTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    eventMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    eventVenue: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    eventType: {
      fontSize: 13,
      color: colors.textMuted,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: '100%',
      paddingVertical: 16,
      borderRadius: 14,
      marginTop: 4,
    },
    primaryBtnText: {
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    secondaryBtn: {
      width: '100%',
      paddingVertical: 15,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
    },
    secondaryBtnText: {
      fontSize: 15,
      fontWeight: '600',
    },
  });
}

// ─── Sign-in gate ─────────────────────────────────────────────────────────────

function SignInGate() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => makeGateStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed" size={40} color={colors.gold} />
        </View>
        <Text style={styles.heading}>Sign in to add events</Text>
        <Text style={styles.sub}>
          Create an account or sign in to share open mics, jam sessions, and more with the community.
        </Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.gold }]}
          activeOpacity={0.85}
          onPress={() => router.push('/(auth)/sign-in')}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
        >
          <Text style={[styles.btnText, { color: colors.bg }]}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function makeGateStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 36,
      gap: 14,
    },
    iconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: `${colors.gold}18`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    heading: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    sub: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    btn: {
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 48,
      marginTop: 8,
    },
    btnText: {
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
  });
}

// ─── Submit form ─────────────────────────────────────────────────────────────

export default function SubmitScreen() {
  const { colors, theme } = useTheme();
  const { addEvent } = useEvents();
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [eventType, setEventType] = useState<EventType>('OPEN_MIC');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submittedEvent, setSubmittedEvent] = useState<MockEvent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [signupsEnabled, setSignupsEnabled] = useState(false);
  const [maxSlots, setMaxSlots] = useState('10');
  const [coverPhoto, setCoverPhoto] = useState<UnsplashPhoto | null>(null);
  const [showUnsplash, setShowUnsplash] = useState(false);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const setField = useCallback((key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  async function handleSubmit() {
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!coverPhoto) {
      Alert.alert(
        'Add a Cover Photo?',
        'A photo makes your event stand out.',
        [
          { text: 'Browse Unsplash', onPress: () => setShowUnsplash(true) },
          {
            text: 'Skip',
            style: 'destructive',
            onPress: () => doSubmit(null),
          },
        ]
      );
      return;
    }

    await doSubmit(coverPhoto);
  }

  async function doSubmit(photo: UnsplashPhoto | null) {
    try {
      setSubmitting(true);
      setSubmitError(null);
      const token = await getToken();
      const input = buildCreateInput(eventType, form, signupsEnabled, maxSlots, photo);
      const newEvent = await addEvent(input, token ?? undefined);
      setSubmittedEvent(newEvent);
    } catch {
      setSubmitError('Could not submit the event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmitAnother() {
    setForm(INITIAL_FORM);
    setErrors({});
    setEventType('OPEN_MIC');
    setSubmittedEvent(null);
    setCoverPhoto(null);
  }

  function handleGoToDiscover() {
    setForm(INITIAL_FORM);
    setErrors({});
    setEventType('OPEN_MIC');
    setSubmittedEvent(null);
    router.push('/(tabs)');
  }

  if (!isSignedIn) {
    return <SignInGate />;
  }

  if (submittedEvent) {
    return (
      <SuccessScreen
        event={submittedEvent}
        onSubmitAnother={handleSubmitAnother}
        onGoToDiscover={handleGoToDiscover}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <ScrollView
        contentContainerStyle={[styles.content, isWide && styles.contentWide]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Add an Event</Text>
        <Text style={styles.sub}>Share an open mic, jam session, comedy night, poetry slam, workshop, or open studio.</Text>

        {/* Event type */}
        <Label text="Event Type" colors={colors} />
        <View style={styles.typeGrid}>
          {(EVENT_TYPE_OPTIONS).map(({ value: t, label }) => {
            const active = eventType === t;
            const accentColor = GOLD_TYPES.has(t) ? colors.gold : colors.jam;
            return (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeBtn,
                  active && { borderColor: accentColor, backgroundColor: `${accentColor}18` },
                ]}
                onPress={() => setEventType(t)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
              >
                <Text style={[styles.typeBtnText, active && { color: accentColor, fontWeight: '700' }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Field
          label="Event Title"
          placeholder="e.g. Tuesday Night Jazz Jam"
          value={form.title}
          onChangeText={(v) => setField('title', v)}
          error={errors.title}
          required
          colors={colors}
        />
        <Field
          label="Venue Name"
          placeholder="e.g. The Continental Club"
          value={form.venueName}
          onChangeText={(v) => setField('venueName', v)}
          error={errors.venueName}
          required
          colors={colors}
        />
        <Field
          label="Address"
          placeholder="e.g. 1315 S Congress Ave, Austin, TX"
          value={form.address}
          onChangeText={(v) => setField('address', v)}
          error={errors.address}
          required
          colors={colors}
        />
        <Field
          label="Neighborhood"
          placeholder="e.g. South Congress"
          value={form.neighborhood}
          onChangeText={(v) => setField('neighborhood', v)}
          colors={colors}
        />
        <Field
          label="City"
          placeholder="e.g. Austin"
          value={form.city}
          onChangeText={(v) => setField('city', v)}
          error={errors.city}
          required
          colors={colors}
        />
        <Field
          label="State"
          placeholder="e.g. TX"
          value={form.state}
          onChangeText={(v) => setField('state', v)}
          error={errors.state}
          required
          colors={colors}
        />
        <Field
          label="Date"
          placeholder="e.g. Every Tuesday · or a specific date"
          value={form.date}
          onChangeText={(v) => setField('date', v)}
          error={errors.date}
          required
          colors={colors}
        />
        <Field
          label="Start Time"
          placeholder="e.g. 8:00 PM"
          value={form.startTime}
          onChangeText={(v) => setField('startTime', v)}
          error={errors.startTime}
          required
          colors={colors}
        />
        <Field
          label="Cover Charge"
          placeholder="e.g. Free · $5 at door"
          value={form.coverCharge}
          onChangeText={(v) => setField('coverCharge', v)}
          colors={colors}
        />
        <Field
          label="Slot Duration"
          placeholder="e.g. 5 min · 3 songs · Open"
          value={form.slotDuration}
          onChangeText={(v) => setField('slotDuration', v)}
          colors={colors}
        />
        <Field
          label="Backline Provided"
          placeholder="e.g. Drum kit, bass amp, piano"
          value={form.backline}
          onChangeText={(v) => setField('backline', v)}
          colors={colors}
        />
        <Field
          label="Description"
          placeholder="What should musicians know? Genres, sign-up process, vibe…"
          value={form.description}
          onChangeText={(v) => setField('description', v)}
          multiline
          colors={colors}
        />

        {/* Cover Photo */}
        <Label text="Cover Photo" colors={colors} />
        <TouchableOpacity
          style={[
            styles.photoPickerBtn,
            coverPhoto && styles.photoPickerBtnSelected,
            { borderColor: coverPhoto ? colors.gold : colors.border, backgroundColor: colors.surface },
          ]}
          onPress={() => setShowUnsplash(true)}
          activeOpacity={0.85}
        >
          {coverPhoto ? (
            <>
              <Image source={{ uri: coverPhoto.thumb }} style={styles.photoPreview} resizeMode="cover" />
              <View style={styles.photoOverlay}>
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.photoOverlayText}>Change photo</Text>
              </View>
            </>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="image-outline" size={28} color={colors.textMuted} />
              <Text style={[styles.photoPlaceholderText, { color: colors.textMuted }]}>
                Browse Unsplash for a cover photo
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {coverPhoto && (
          <Text style={[styles.photoCredit, { color: colors.textMuted }]}>
            Photo by {coverPhoto.photographer} on Unsplash
          </Text>
        )}

        {/* Sign-up management toggle */}
        <View style={[styles.signupsToggleCard, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}>
          <View style={styles.signupsToggleRow}>
            <View style={styles.signupsToggleInfo}>
              <Text style={[styles.signupsToggleLabel, { color: colors.text }]}>Enable performer sign-ups</Text>
              <Text style={[styles.signupsToggleDesc, { color: colors.textMuted }]}>
                Let performers sign up for slots directly in the app
              </Text>
            </View>
            <Switch
              value={signupsEnabled}
              onValueChange={setSignupsEnabled}
              trackColor={{ false: colors.border, true: colors.gold }}
              thumbColor={colors.surface}
            />
          </View>
          {signupsEnabled && (
            <Field
              label="Max Slots"
              placeholder="e.g. 10"
              value={maxSlots}
              onChangeText={setMaxSlots}
              colors={colors}
            />
          )}
        </View>

        {submitError && (
          <Text style={[styles.submitError, { color: colors.jam }]}>{submitError}</Text>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityLabel="Submit event"
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={[styles.submitText, { color: colors.bg }]}>Submit Event</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Keep it real — open mics, jam sessions, comedy nights, poetry, art — no ticketed shows
          or promoters.
        </Text>
      </ScrollView>

      <UnsplashPickerModal
        visible={showUnsplash}
        query={EVENT_TYPE_QUERIES[eventType]}
        onSelect={(photo) => {
          setCoverPhoto(photo);
          setShowUnsplash(false);
        }}
        onClose={() => setShowUnsplash(false)}
      />
    </SafeAreaView>
  );
}

function Label({
  text,
  required,
  colors,
}: {
  text: string;
  required?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <Text style={makeLabelStyle(colors)}>
      {text}
      {required && <Text style={{ color: colors.jam }}> *</Text>}
    </Text>
  );
}

function makeLabelStyle(colors: ReturnType<typeof useTheme>['colors']) {
  return {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: colors.textMuted,
    marginBottom: 8,
    marginTop: 16,
  };
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  multiline = false,
  required = false,
  error,
  colors,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  required?: boolean;
  error?: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const inputStyle = makeInputStyle(colors, !!error, multiline);

  return (
    <View>
      <Label text={label} required={required} colors={colors} />
      <TextInput
        style={inputStyle}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        accessibilityLabel={label}
      />
      {error && <Text style={makeErrorStyle(colors)}>{error}</Text>}
    </View>
  );
}

function makeInputStyle(
  colors: ReturnType<typeof useTheme>['colors'],
  hasError: boolean,
  multiline: boolean,
) {
  return StyleSheet.flatten([
    {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: hasError ? colors.jam : colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      color: colors.text,
    },
    multiline && { height: 110, paddingTop: 13 },
  ]);
}

function makeErrorStyle(colors: ReturnType<typeof useTheme>['colors']) {
  return {
    fontSize: 12,
    color: colors.jam,
    marginTop: 4,
    marginLeft: 2,
  };
}

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
      marginBottom: 6,
    },
    sub: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 4,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    typeBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    typeBtnText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    submitBtn: {
      backgroundColor: colors.gold,
      borderRadius: 14,
      paddingVertical: 17,
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 16,
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitText: {
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    submitError: {
      fontSize: 13,
      textAlign: 'center',
      marginBottom: 8,
      marginTop: 12,
    },
    signupsToggleCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 16,
      marginTop: 16,
      gap: 4,
    },
    signupsToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    signupsToggleInfo: { flex: 1 },
    signupsToggleLabel: { fontSize: 15, fontWeight: '600' },
    signupsToggleDesc: { fontSize: 12, marginTop: 2, lineHeight: 17 },
    disclaimer: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: 12,
    },
    photoPickerBtn: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: 12,
      overflow: 'hidden',
      minHeight: 120,
    },
    photoPickerBtnSelected: {
      borderStyle: 'solid',
    },
    photoPreview: {
      width: '100%',
      height: 160,
    },
    photoOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
    },
    photoOverlayText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
    },
    photoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 32,
    },
    photoPlaceholderText: {
      fontSize: 13,
      textAlign: 'center',
    },
    photoCredit: {
      fontSize: 11,
      marginTop: -4,
      marginLeft: 4,
    },
  });
}

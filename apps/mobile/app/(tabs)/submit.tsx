import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
  Modal,
  FlatList,
} from 'react-native';
import { UnsplashPickerModal } from '../../components/UnsplashPickerModal';
import { CityPickerModal } from '../../components/CityPickerModal';
import { CalendarModal } from '../../components/CalendarModal';
import type { UnsplashPhoto } from '@on-deck/shared';
import { useRouter } from 'expo-router';
import { apiClient } from '../../lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../context/ThemeContext';
import { useEvents } from '../../context/EventsContext';
import type { EventType, CreateEventInput } from '@on-deck/shared';
import type { MockEvent } from '../../constants/mock-data';
import type { CityOption } from '../../constants/cities';

// ─── Constants ────────────────────────────────────────────────────────────────

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

const COVER_CHARGE_OPTIONS = ['Free', '$5', '$10', '$15', '$20', '$25+'];

// Generate times in 15-min increments across full 24h, starting at 6 AM
function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let i = 0; i < 96; i++) {
    const totalMinutes = (i * 15 + 6 * 60) % (24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const meridiem = h < 12 ? 'AM' : 'PM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    times.push(`${displayH}:${m.toString().padStart(2, '0')} ${meridiem}`);
  }
  return times;
}
const TIME_OPTIONS = generateTimeOptions();

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  venueName: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  specificDate: Date | null;
  isRecurring: boolean;
  recurringDesc: string;
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
  specificDate: null,
  isRecurring: false,
  recurringDesc: '',
  startTime: '',
  coverCharge: 'Free',
  slotDuration: '',
  backline: '',
  description: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip HTML/script tags to prevent injection from free-text fields. */
function sanitize(s: string): string {
  return s.replace(/<[^>]*>/g, '').trim();
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.title.trim()) errors.title = 'Event title is required';
  if (!form.venueName.trim()) errors.venueName = 'Venue name is required';
  if (!form.address.trim()) errors.address = 'Address is required';
  if (!form.city.trim()) errors.city = 'City is required';
  if (!form.isRecurring && !form.specificDate) errors.date = 'Date is required';
  if (form.isRecurring && !form.recurringDesc.trim()) errors.date = 'Please describe the recurring schedule';
  if (!form.startTime) errors.startTime = 'Start time is required';
  return errors;
}

function toIso(form: FormState): string {
  const base = form.specificDate ?? new Date();
  const match = form.startTime.match(/^(\d+):(\d+)\s(AM|PM)$/);
  if (match) {
    let hours = parseInt(match[1]!, 10);
    const minutes = parseInt(match[2]!, 10);
    const meridiem = match[3]!;
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    const result = new Date(base);
    result.setHours(hours, minutes, 0, 0);
    return result.toISOString();
  }
  const fallback = new Date(base);
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
  return {
    title: sanitize(form.title),
    type: eventType,
    startsAt: toIso(form),
    description: sanitize(form.description) || undefined,
    genres: [],
    coverCharge: form.coverCharge || 'Free',
    slotDuration: sanitize(form.slotDuration) || undefined,
    backline: sanitize(form.backline) ? [sanitize(form.backline)] : [],
    signUpMethod: signupsEnabled ? 'APP' : 'DOOR',
    isRecurring: form.isRecurring,
    recurringDescription: form.isRecurring ? sanitize(form.recurringDesc) : undefined,
    signupsEnabled,
    maxSlots: signupsEnabled && maxSlots.trim() ? parseInt(maxSlots.trim(), 10) : undefined,
    venue: {
      name: sanitize(form.venueName),
      address: sanitize(form.address),
      neighborhood: sanitize(form.neighborhood) || undefined,
      city: form.city,
      state: form.state,
    },
    coverImageUrl: photo?.url,
    coverImageThumb: photo?.thumb,
    coverImagePhotographer: photo?.photographer,
    coverImagePhotographerUrl: photo?.photographerUrl,
    coverImageAttribution: photo ? `Photo by ${photo.photographer} on Unsplash` : undefined,
  };
}

// ─── Time Picker Modal ────────────────────────────────────────────────────────

function TimePickerModal({
  visible,
  selected,
  onSelect,
  onClose,
  colors,
}: {
  visible: boolean;
  selected: string;
  onSelect: (time: string) => void;
  onClose: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[tpStyles.overlay]}>
        <View style={[tpStyles.sheet, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <View style={[tpStyles.header, { borderBottomColor: colors.border }]}>
            <Text style={[tpStyles.title, { color: colors.text }]}>Start Time</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={TIME_OPTIONS}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const active = item === selected;
              return (
                <TouchableOpacity
                  style={[
                    tpStyles.option,
                    { borderBottomColor: colors.border },
                    active && { backgroundColor: `${colors.gold}18` },
                  ]}
                  onPress={() => { onSelect(item); onClose(); }}
                  activeOpacity={0.7}
                >
                  <Text style={[tpStyles.optionText, { color: active ? colors.gold : colors.text }, active && { fontWeight: '700' }]}>
                    {item}
                  </Text>
                  {active && <Ionicons name="checkmark" size={18} color={colors.gold} />}
                </TouchableOpacity>
              );
            }}
            style={tpStyles.list}
          />
        </View>
      </View>
    </Modal>
  );
}

const tpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
  },
  title: { fontSize: 16, fontWeight: '700' },
  list: { flexGrow: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: { fontSize: 16 },
});

// ─── Chip Selector (single select) ───────────────────────────────────────────

function ChipSelector({
  options,
  selected,
  onSelect,
  colors,
}: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
      {options.map((opt) => {
        const active = opt === selected;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onSelect(opt)}
            activeOpacity={0.8}
            style={[
              csStyles.chip,
              { backgroundColor: colors.surface, borderColor: colors.border },
              active && { borderColor: colors.gold, backgroundColor: `${colors.gold}18` },
            ]}
          >
            <Text style={[csStyles.chipText, { color: active ? colors.gold : colors.textSecondary }, active && { fontWeight: '700' }]}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const csStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: { fontSize: 14 },
});

// ─── Select Button (tap to open picker) ───────────────────────────────────────

function SelectButton({
  placeholder,
  value,
  onPress,
  error,
  icon,
  colors,
}: {
  placeholder: string;
  value: string;
  onPress: () => void;
  error?: string;
  icon?: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[
          sbStyles.btn,
          { backgroundColor: colors.surface, borderColor: error ? colors.jam : colors.border },
        ]}
      >
        <Text style={[sbStyles.value, { color: value ? colors.text : colors.textMuted }]}>
          {value || placeholder}
        </Text>
        <Ionicons name={(icon as any) ?? 'chevron-down'} size={16} color={colors.textMuted} />
      </TouchableOpacity>
      {error && <Text style={[sbStyles.error, { color: colors.jam }]}>{error}</Text>}
    </View>
  );
}

const sbStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  value: { fontSize: 15 },
  error: { fontSize: 12, marginTop: 4, marginLeft: 2 },
});

// ─── Success screen ───────────────────────────────────────────────────────────

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
    safe: { flex: 1, backgroundColor: 'transparent' },
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
    safe: { flex: 1, backgroundColor: 'transparent' },
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

// ─── Submit form ──────────────────────────────────────────────────────────────

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
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const photoManuallySelected = useRef(false);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    if (photoManuallySelected.current) return;
    let cancelled = false;
    apiClient.unsplash.search(EVENT_TYPE_QUERIES[eventType])
      .then((photos) => {
        if (cancelled || photos.length === 0) return;
        const photo = photos[Math.floor(Math.random() * photos.length)];
        setCoverPhoto(photo);
        apiClient.unsplash.track(photo.downloadLocation).catch(() => {});
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [eventType]);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  function handleCitySelect(city: CityOption | null) {
    if (!city) return;
    setForm((prev) => ({ ...prev, city: city.city, state: city.state }));
    setErrors((prev) => ({ ...prev, city: undefined }));
  }

  async function handleSubmit() {
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    try {
      setSubmitting(true);
      setSubmitError(null);
      const token = await getToken();
      const input = buildCreateInput(eventType, form, signupsEnabled, maxSlots, coverPhoto);
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
    photoManuallySelected.current = false;
  }

  function handleGoToDiscover() {
    setForm(INITIAL_FORM);
    setErrors({});
    setEventType('OPEN_MIC');
    setSubmittedEvent(null);
    router.push('/(tabs)');
  }

  if (!isSignedIn) return <SignInGate />;

  if (submittedEvent) {
    return (
      <SuccessScreen
        event={submittedEvent}
        onSubmitAnother={handleSubmitAnother}
        onGoToDiscover={handleGoToDiscover}
      />
    );
  }

  const dateDisplayValue = form.isRecurring
    ? ''
    : form.specificDate
      ? form.specificDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      : '';

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
          {EVENT_TYPE_OPTIONS.map(({ value: t, label }) => {
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
          placeholder="e.g. 1315 S Congress Ave"
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

        {/* City — structured picker */}
        <Label text="City" required colors={colors} />
        <SelectButton
          placeholder="Select a city…"
          value={form.city ? `${form.city}${form.state ? `, ${form.state}` : ''}` : ''}
          onPress={() => setShowCityPicker(true)}
          error={errors.city}
          colors={colors}
        />

        {/* Date */}
        <Label text="Date" required colors={colors} />
        <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.toggleOption, !form.isRecurring && { backgroundColor: colors.gold }]}
            onPress={() => setField('isRecurring', false)}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleOptionText, { color: !form.isRecurring ? colors.bg : colors.textSecondary }]}>
              Specific Date
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, form.isRecurring && { backgroundColor: colors.gold }]}
            onPress={() => setField('isRecurring', true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleOptionText, { color: form.isRecurring ? colors.bg : colors.textSecondary }]}>
              Recurring
            </Text>
          </TouchableOpacity>
        </View>

        {!form.isRecurring ? (
          <SelectButton
            placeholder="Pick a date…"
            value={dateDisplayValue}
            onPress={() => setShowCalendar(true)}
            error={errors.date}
            icon="calendar-outline"
            colors={colors}
          />
        ) : (
          <View>
            <TextInput
              style={[
                styles.textInput,
                { borderColor: errors.date ? colors.jam : colors.border, color: colors.text, backgroundColor: colors.surface },
              ]}
              placeholder='e.g. Every Tuesday'
              placeholderTextColor={colors.textMuted}
              value={form.recurringDesc}
              onChangeText={(v) => { setField('recurringDesc', v); setErrors((p) => ({ ...p, date: undefined })); }}
            />
            {errors.date && <Text style={[styles.errorText, { color: colors.jam }]}>{errors.date}</Text>}
          </View>
        )}

        {/* Start Time — structured picker */}
        <Label text="Start Time" required colors={colors} />
        <SelectButton
          placeholder="Select a time…"
          value={form.startTime}
          onPress={() => setShowTimePicker(true)}
          error={errors.startTime}
          icon="time-outline"
          colors={colors}
        />

        {/* Cover Charge — structured chips */}
        <Label text="Cover Charge" colors={colors} />
        <ChipSelector
          options={COVER_CHARGE_OPTIONS}
          selected={form.coverCharge}
          onSelect={(v) => setField('coverCharge', v)}
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
            <View style={{ marginTop: 12 }}>
              <Label text="Max Slots" colors={colors} />
              <TextInput
                style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
                placeholder="e.g. 10"
                placeholderTextColor={colors.textMuted}
                value={maxSlots}
                onChangeText={setMaxSlots}
                keyboardType="number-pad"
              />
            </View>
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

      <CityPickerModal
        visible={showCityPicker}
        selectedCity={form.city ? { city: form.city, state: form.state, label: `${form.city}, ${form.state}` } : null}
        onSelect={handleCitySelect}
        onClose={() => setShowCityPicker(false)}
      />
      <CalendarModal
        visible={showCalendar}
        events={[]}
        selectedDate={form.specificDate}
        onSelectDate={(date) => { setField('specificDate', date); setErrors((p) => ({ ...p, date: undefined })); }}
        onClose={() => setShowCalendar(false)}
        allowAnyFutureDate
      />
      <TimePickerModal
        visible={showTimePicker}
        selected={form.startTime}
        onSelect={(t) => { setField('startTime', t); setErrors((p) => ({ ...p, startTime: undefined })); }}
        onClose={() => setShowTimePicker(false)}
        colors={colors}
      />
      <UnsplashPickerModal
        visible={showUnsplash}
        query={EVENT_TYPE_QUERIES[eventType]}
        onSelect={(photo) => {
          photoManuallySelected.current = true;
          setCoverPhoto(photo);
          setShowUnsplash(false);
        }}
        onClose={() => setShowUnsplash(false)}
      />
    </SafeAreaView>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

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
  return (
    <View>
      <Label text={label} required={required} colors={colors} />
      <TextInput
        style={StyleSheet.flatten([
          {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: error ? colors.jam : colors.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 13,
            fontSize: 15,
            color: colors.text,
          },
          multiline && { height: 110, paddingTop: 13 },
        ])}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        accessibilityLabel={label}
      />
      {error && <Text style={{ fontSize: 12, color: colors.jam, marginTop: 4, marginLeft: 2 }}>{error}</Text>}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    content: { padding: 20, paddingBottom: 48 },
    contentWide: { maxWidth: 560, alignSelf: 'center', width: '100%' },
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
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    typeBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeBtnText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
    toggleRow: {
      flexDirection: 'row',
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'hidden',
      marginBottom: 10,
    },
    toggleOption: {
      flex: 1,
      paddingVertical: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toggleOptionText: { fontSize: 14, fontWeight: '600' },
    textInput: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
    },
    errorText: { fontSize: 12, marginTop: 4, marginLeft: 2 },
    submitBtn: {
      backgroundColor: colors.gold,
      borderRadius: 14,
      paddingVertical: 17,
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 16,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
    submitError: { fontSize: 13, textAlign: 'center', marginBottom: 8, marginTop: 12 },
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
    photoPickerBtnSelected: { borderStyle: 'solid' },
    photoPreview: { width: '100%', height: 160 },
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
    photoOverlayText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    photoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 32,
    },
    photoPlaceholderText: { fontSize: 13, textAlign: 'center' },
    photoCredit: { fontSize: 11, marginTop: -4, marginLeft: 4 },
  });
}

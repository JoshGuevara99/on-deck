import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useEvents } from '../../context/EventsContext';
import type { EventType } from '@on-deck/shared';
import type { MockEvent } from '../../constants/mock-data';

interface FormState {
  title: string;
  venueName: string;
  address: string;
  neighborhood: string;
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
  date?: string;
  startTime?: string;
}

const INITIAL_FORM: FormState = {
  title: '',
  venueName: '',
  address: '',
  neighborhood: '',
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
  if (!form.date.trim()) errors.date = 'Date is required';
  if (!form.startTime.trim()) errors.startTime = 'Start time is required';
  return errors;
}

/** Try to build a Date from free-text date + time strings. Falls back to tonight at 8 PM. */
function parseStartsAt(dateStr: string, timeStr: string): Date {
  const combined = `${dateStr} ${timeStr}`;
  const parsed = new Date(combined);
  if (!isNaN(parsed.getTime())) return parsed;

  // Fall back: today at 8 PM so the event shows up under "Tonight"
  const fallback = new Date();
  fallback.setHours(20, 0, 0, 0);
  return fallback;
}

function buildEvent(eventType: EventType, form: FormState): MockEvent {
  return {
    id: `user-${Date.now()}`,
    title: form.title.trim(),
    type: eventType,
    startsAt: parseStartsAt(form.date, form.startTime),
    venue: {
      id: `venue-${Date.now()}`,
      name: form.venueName.trim(),
      address: form.address.trim(),
      neighborhood: form.neighborhood.trim() || form.address.trim(),
      city: 'Austin',
      state: 'TX',
    },
    description: form.description.trim(),
    genres: [],
    isRecurring: /every/i.test(form.date),
    recurringDescription: /every/i.test(form.date) ? form.date.trim() : undefined,
    backline: form.backline.trim() ? [form.backline.trim()] : undefined,
    coverCharge: form.coverCharge.trim() || 'Free',
    slotDuration: form.slotDuration.trim() || undefined,
    signUpMethod: 'door',
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

// ─── Submit form ─────────────────────────────────────────────────────────────

export default function SubmitScreen() {
  const { colors, theme } = useTheme();
  const { addEvent } = useEvents();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [eventType, setEventType] = useState<EventType>('OPEN_MIC');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submittedEvent, setSubmittedEvent] = useState<MockEvent | null>(null);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const setField = useCallback((key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  function handleSubmit() {
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const newEvent = buildEvent(eventType, form);
    addEvent(newEvent);
    setSubmittedEvent(newEvent);
  }

  function handleSubmitAnother() {
    setForm(INITIAL_FORM);
    setErrors({});
    setEventType('OPEN_MIC');
    setSubmittedEvent(null);
  }

  function handleGoToDiscover() {
    setForm(INITIAL_FORM);
    setErrors({});
    setEventType('OPEN_MIC');
    setSubmittedEvent(null);
    router.push('/(tabs)');
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
        <Text style={styles.sub}>Share an open mic or jam session with the community.</Text>

        {/* Event type */}
        <Label text="Event Type" colors={colors} />
        <View style={styles.typeRow}>
          {(['OPEN_MIC', 'JAM_SESSION'] as EventType[]).map((t) => {
            const active = eventType === t;
            const accentColor = t === 'OPEN_MIC' ? colors.gold : colors.jam;
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
                  {t === 'OPEN_MIC' ? 'Open Mic' : 'Jam Session'}
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

        <TouchableOpacity
          style={styles.submitBtn}
          activeOpacity={0.85}
          onPress={handleSubmit}
          accessibilityLabel="Submit event"
          accessibilityRole="button"
        >
          <Text style={[styles.submitText, { color: colors.bg }]}>Submit Event</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Submissions are reviewed before going live. Keep it real — no promoters, ticketed shows,
          or venues you don't play.
        </Text>
      </ScrollView>
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
    typeRow: {
      flexDirection: 'row',
      gap: 10,
    },
    typeBtn: {
      flex: 1,
      paddingVertical: 13,
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
      marginTop: 28,
      marginBottom: 16,
    },
    submitText: {
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    disclaimer: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: 12,
    },
  });
}

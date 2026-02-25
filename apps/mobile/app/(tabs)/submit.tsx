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
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { EventType } from '@on-deck/shared';

interface FormState {
  title: string;
  venueName: string;
  address: string;
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

export default function SubmitScreen() {
  const { colors, theme } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [eventType, setEventType] = useState<EventType>('OPEN_MIC');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const setField = useCallback((key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear error on edit
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  function handleSubmit() {
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Alert.alert(
        'Missing required fields',
        'Please fill in all required fields before submitting.',
        [{ text: 'OK' }],
      );
      return;
    }

    // In production this would POST to the API
    setSubmitted(true);
    Alert.alert(
      'Submission received!',
      'Thanks for adding to the community. Your event will be reviewed and posted within 24 hours.',
      [
        {
          text: 'Submit another',
          onPress: () => {
            setForm(INITIAL_FORM);
            setErrors({});
            setSubmitted(false);
          },
        },
        { text: 'Done', style: 'default' },
      ],
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
          style={[styles.submitBtn, submitted && styles.submitBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={submitted}
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
    submitBtnDisabled: {
      opacity: 0.5,
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

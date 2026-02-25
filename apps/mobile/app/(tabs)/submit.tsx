import { useState } from 'react';
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
  Platform,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import type { EventType } from '@on-deck/shared';

export default function SubmitScreen() {
  const [eventType, setEventType] = useState<EventType>('OPEN_MIC');
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <ScrollView
        contentContainerStyle={[styles.content, isWide && styles.contentWide]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Add an Event</Text>
        <Text style={styles.sub}>Share an open mic or jam session with the community.</Text>

        {/* Event type */}
        <Label text="Event Type" />
        <View style={styles.typeRow}>
          {(['OPEN_MIC', 'JAM_SESSION'] as EventType[]).map((t) => {
            const active = eventType === t;
            const accentColor = t === 'OPEN_MIC' ? COLORS.gold : COLORS.jam;
            return (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeBtn,
                  active && { borderColor: accentColor, backgroundColor: `${accentColor}18` },
                ]}
                onPress={() => setEventType(t)}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeBtnText, active && { color: accentColor, fontWeight: '700' }]}>
                  {t === 'OPEN_MIC' ? 'Open Mic' : 'Jam Session'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Field label="Event Title" placeholder="e.g. Tuesday Night Jazz Jam" />
        <Field label="Venue Name" placeholder="e.g. The Continental Club" />
        <Field label="Address" placeholder="e.g. 1315 S Congress Ave, Austin, TX" />
        <Field label="Date" placeholder="e.g. Every Tuesday · or a specific date" />
        <Field label="Start Time" placeholder="e.g. 8:00 PM" />
        <Field label="Cover Charge" placeholder="e.g. Free · $5 at door" />
        <Field label="Slot Duration" placeholder="e.g. 5 min · 3 songs · Open" />
        <Field label="Backline Provided" placeholder="e.g. Drum kit, bass amp, piano" />
        <Field
          label="Description"
          placeholder="What should musicians know? Genres, sign-up process, vibe…"
          multiline
        />

        <TouchableOpacity style={styles.submitBtn} activeOpacity={0.85}>
          <Text style={styles.submitText}>Submit Event</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Submissions are reviewed before going live. Keep it real — no promoters, ticketed shows, or venues you don't play.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={labelStyles.text}>{text}</Text>;
}

const labelStyles = StyleSheet.create({
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    marginBottom: 8,
    marginTop: 16,
  },
});

function Field({
  label,
  placeholder,
  multiline = false,
}: {
  label: string;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View>
      <Label text={label} />
      <TextInput
        style={[fieldStyles.input, multiline && fieldStyles.multiline]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.text,
  },
  multiline: {
    height: 110,
    textAlignVertical: 'top',
    paddingTop: 13,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
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
    color: COLORS.text,
    letterSpacing: 0.3,
    marginTop: 12,
    marginBottom: 6,
  },
  sub: {
    fontSize: 15,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  submitBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 16,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A0A12',
    letterSpacing: 0.5,
  },
  disclaimer: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});

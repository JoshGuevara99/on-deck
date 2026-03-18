import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import type { PerformerType } from '@on-deck/shared';
import type { MockEvent } from '../constants/mock-data';

interface Props {
  event: MockEvent;
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: {
    performerType?: PerformerType;
    instruments: string[];
    genres: string[];
    note?: string;
    instagramHandle?: string;
    tiktokHandle?: string;
  }) => Promise<{ slotPosition: number }>;
}

const PERFORMER_TYPES: { value: PerformerType; label: string; icon: string }[] = [
  { value: 'MUSICIAN',    label: 'Musician',    icon: 'musical-notes-outline' },
  { value: 'COMEDIAN',    label: 'Comedian',    icon: 'happy-outline' },
  { value: 'POET',        label: 'Poet',        icon: 'book-outline' },
  { value: 'STORYTELLER', label: 'Storyteller', icon: 'mic-outline' },
  { value: 'OTHER',       label: 'Other',       icon: 'ellipsis-horizontal-outline' },
];

export function SignUpModal({ event, visible, onClose, onSubmit }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [performerType, setPerformerType] = useState<PerformerType | undefined>(undefined);
  const [instruments, setInstruments] = useState('');
  const [genres, setGenres] = useState('');
  const [note, setNote] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slotPosition, setSlotPosition] = useState<number | null>(null);

  function reset() {
    setPerformerType(undefined);
    setInstruments('');
    setGenres('');
    setNote('');
    setInstagramHandle('');
    setTiktokHandle('');
    setError(null);
    setSlotPosition(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const result = await onSubmit({
        performerType,
        instruments: instruments.split(',').map((s) => s.trim()).filter(Boolean),
        genres: genres.split(',').map((s) => s.trim()).filter(Boolean),
        note: note.trim() || undefined,
        instagramHandle: instagramHandle.trim().replace(/^@/, '') || undefined,
        tiktokHandle: tiktokHandle.trim().replace(/^@/, '') || undefined,
      });
      setSlotPosition(result.slotPosition);
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.includes('already signed up')) setError('You\'re already on the list.');
      else if (msg.includes('full')) setError('This event is full.');
      else setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const showInstruments = performerType === 'MUSICIAN';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Sign Up to Perform</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{event.title} · {event.venue.name}</Text>
          </View>
          <TouchableOpacity onPress={handleClose} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {slotPosition !== null ? (
          // ─── Success state ────────────────────────────────────────────────
          <View style={styles.success}>
            <Ionicons name="checkmark-circle" size={64} color={colors.gold} />
            <Text style={styles.successHeading}>You're on the list!</Text>
            <Text style={styles.successSub}>
              You're <Text style={{ color: colors.gold, fontWeight: '800' }}>#{slotPosition}</Text> tonight at {event.venue.name}.
            </Text>
            {(instagramHandle.trim() || tiktokHandle.trim()) && (
              <Text style={[styles.successSocials, { color: colors.textMuted }]}>
                {[
                  instagramHandle.trim() && `@${instagramHandle.trim().replace(/^@/, '')} on Instagram`,
                  tiktokHandle.trim() && `@${tiktokHandle.trim().replace(/^@/, '')} on TikTok`,
                ].filter(Boolean).join(' · ')}
              </Text>
            )}
            <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.gold }]} onPress={handleClose}>
              <Text style={[styles.doneBtnText, { color: colors.bg }]}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // ─── Form ─────────────────────────────────────────────────────────
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>What do you do?</Text>
            <View style={styles.typeGrid}>
              {PERFORMER_TYPES.map(({ value, label, icon }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.typeBtn, performerType === value && styles.typeBtnActive]}
                  onPress={() => setPerformerType(value)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={icon as any} size={18} color={performerType === value ? colors.bg : colors.textSecondary} />
                  <Text style={[styles.typeBtnText, performerType === value && styles.typeBtnTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {showInstruments && (
              <>
                <Text style={styles.label}>Instrument(s)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. guitar, vocals"
                  placeholderTextColor={colors.textMuted}
                  value={instruments}
                  onChangeText={setInstruments}
                />
              </>
            )}

            <Text style={styles.label}>Genre / Style</Text>
            <TextInput
              style={styles.input}
              placeholder={
                performerType === 'COMEDIAN' ? 'e.g. observational, dark humor' :
                performerType === 'POET' ? 'e.g. spoken word, haiku' :
                'e.g. jazz, blues, indie'
              }
              placeholderTextColor={colors.textMuted}
              value={genres}
              onChangeText={setGenres}
            />

            <Text style={styles.label}>Note to host <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Anything the host should know?"
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.label}>Socials <Text style={styles.optional}>(optional — shown on the lineup)</Text></Text>
            <TextInput
              style={[styles.input, styles.socialInput]}
              placeholder="Instagram handle"
              placeholderTextColor={colors.textMuted}
              value={instagramHandle}
              onChangeText={setInstagramHandle}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={{ height: 8 }} />
            <TextInput
              style={[styles.input, styles.socialInput]}
              placeholder="TikTok handle"
              placeholderTextColor={colors.textMuted}
              value={tiktokHandle}
              onChangeText={setTiktokHandle}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={colors.bg} />
                : <Text style={[styles.submitText, { color: colors.bg }]}>Confirm Sign-Up</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: 20,
      paddingTop: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    headerSub: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    form: {
      padding: 20,
      paddingBottom: 48,
      gap: 4,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginTop: 20,
      marginBottom: 10,
    },
    optional: {
      fontWeight: '400',
      textTransform: 'none',
      letterSpacing: 0,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    typeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    typeBtnActive: {
      backgroundColor: colors.gold,
      borderColor: colors.gold,
    },
    typeBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    typeBtnTextActive: {
      color: colors.bg,
      fontWeight: '800',
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    inputMultiline: {
      height: 90,
      paddingTop: 12,
    },
    socialInput: {
      paddingLeft: 14,
    },
    error: {
      fontSize: 13,
      color: colors.jam,
      marginTop: 12,
      textAlign: 'center',
    },
    submitBtn: {
      backgroundColor: colors.gold,
      borderRadius: 10,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 24,
    },
    submitText: {
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    success: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 16,
    },
    successHeading: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
    },
    successSub: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    successSocials: {
      fontSize: 13,
      textAlign: 'center',
    },
    doneBtn: {
      borderRadius: 10,
      paddingVertical: 14,
      paddingHorizontal: 48,
      marginTop: 8,
    },
    doneBtnText: {
      fontSize: 16,
      fontWeight: '800',
    },
  });
}

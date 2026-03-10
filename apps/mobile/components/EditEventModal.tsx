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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../lib/api';
import type { MockEvent } from '../constants/mock-data';

interface Props {
  event: MockEvent;
  visible: boolean;
  onClose: () => void;
  onSave: (updated: MockEvent) => void;
}

export function EditEventModal({ event, visible, onClose, onSave }: Props) {
  const { colors } = useTheme();
  const { getToken } = useAuth();
  const styles = makeStyles(colors);

  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? '');
  const [coverCharge, setCoverCharge] = useState(event.coverCharge === 'Free' ? '' : (event.coverCharge ?? ''));
  const [slotDuration, setSlotDuration] = useState(event.slotDuration ?? '');
  const [signupsEnabled, setSignupsEnabled] = useState(event.signupsEnabled);
  const [maxSlots, setMaxSlots] = useState(event.maxSlots != null ? String(event.maxSlots) : '');
  const [recurringDescription, setRecurringDescription] = useState(event.recurringDescription ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const token = await getToken();
      const updated = await apiClient.events.update(
        event.id,
        {
          title: title.trim(),
          description: description.trim() || null,
          coverCharge: coverCharge.trim() || 'Free',
          slotDuration: slotDuration.trim() || null,
          signupsEnabled,
          maxSlots: maxSlots.trim() ? parseInt(maxSlots.trim(), 10) : null,
          recurringDescription: recurringDescription.trim() || null,
        },
        token!,
      );
      onSave(updated);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save changes.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Event</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.bg} />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.jam} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Field label="Title">
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Event title"
              placeholderTextColor={colors.textMuted}
            />
          </Field>

          <Field label="Description">
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="What's this event about?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </Field>

          <Field label="Cover charge">
            <TextInput
              style={styles.input}
              value={coverCharge}
              onChangeText={setCoverCharge}
              placeholder='Free, $5, $10 at door…'
              placeholderTextColor={colors.textMuted}
            />
          </Field>

          <Field label="Slot duration">
            <TextInput
              style={styles.input}
              value={slotDuration}
              onChangeText={setSlotDuration}
              placeholder="5 min, 3 songs, Open…"
              placeholderTextColor={colors.textMuted}
            />
          </Field>

          <Field label="Recurring note">
            <TextInput
              style={styles.input}
              value={recurringDescription}
              onChangeText={setRecurringDescription}
              placeholder="Every Tuesday, 1st Monday of month…"
              placeholderTextColor={colors.textMuted}
            />
          </Field>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.fieldLabel}>Allow performer sign-ups</Text>
              <Text style={styles.fieldHint}>Let artists claim slots via the app</Text>
            </View>
            <Switch
              value={signupsEnabled}
              onValueChange={setSignupsEnabled}
              trackColor={{ false: colors.border, true: colors.gold }}
              thumbColor={colors.bg}
            />
          </View>

          {signupsEnabled && (
            <Field label="Max slots">
              <TextInput
                style={styles.input}
                value={maxSlots}
                onChangeText={setMaxSlots}
                placeholder="Leave blank for unlimited"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </Field>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeBtn: { padding: 4 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    saveBtn: {
      backgroundColor: colors.gold,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 8,
      minWidth: 56,
      alignItems: 'center',
    },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: colors.bg },
    body: { padding: 20 },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.jam,
      padding: 12,
      marginBottom: 16,
    },
    errorText: { fontSize: 13, color: colors.jam, flex: 1 },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
    },
    multiline: { minHeight: 80, textAlignVertical: 'top' },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 16,
    },
    switchLabel: { flex: 1, marginRight: 12 },
    fieldLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
    fieldHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  });
}

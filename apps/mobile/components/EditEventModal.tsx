import { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Switch,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../lib/api';
import { CityPickerModal } from './CityPickerModal';
import { CalendarModal } from './CalendarModal';
import type { MockEvent } from '../constants/mock-data';
import type { CityOption } from '../constants/cities';
import type { EventType } from '@on-deck/shared';

// ─── Constants ────────────────────────────────────────────────────────────────

const GOLD_TYPES = new Set<EventType>(['OPEN_MIC', 'JAM_SESSION', 'OPEN_STAGE']);

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitize(s: string): string {
  return s.replace(/<[^>]*>/g, '').trim();
}

/** Format a Date into a display time string matching our TIME_OPTIONS format. */
function dateToTimeString(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const meridiem = h < 12 ? 'AM' : 'PM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const roundedM = Math.round(m / 15) * 15;
  return `${displayH}:${(roundedM % 60).toString().padStart(2, '0')} ${meridiem}`;
}

function timeStringToIso(date: Date, timeStr: string): string {
  const match = timeStr.match(/^(\d+):(\d+)\s(AM|PM)$/);
  if (!match) return date.toISOString();
  let hours = parseInt(match[1]!, 10);
  const minutes = parseInt(match[2]!, 10);
  const meridiem = match[3]!;
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result.toISOString();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
      <View style={tpStyles.overlay}>
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
            style={tpStyles.list}
            renderItem={({ item }) => {
              const active = item === selected;
              return (
                <TouchableOpacity
                  style={[tpStyles.option, { borderBottomColor: colors.border }, active && { backgroundColor: `${colors.gold}18` }]}
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
          />
        </View>
      </View>
    </Modal>
  );
}

const tpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, maxHeight: '70%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: '700' },
  list: { flexGrow: 0 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  optionText: { fontSize: 16 },
});

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
            <Text style={[csStyles.text, { color: active ? colors.gold : colors.textSecondary }, active && { fontWeight: '700' }]}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const csStyles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  text: { fontSize: 14 },
});

function SelectButton({
  placeholder,
  value,
  onPress,
  icon,
  colors,
}: {
  placeholder: string;
  value: string;
  onPress: () => void;
  icon?: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[sbStyles.btn, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Text style={[sbStyles.value, { color: value ? colors.text : colors.textMuted }]}>
        {value || placeholder}
      </Text>
      <Ionicons name={(icon as any) ?? 'chevron-down'} size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const sbStyles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  value: { fontSize: 15 },
});

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  event: MockEvent;
  visible: boolean;
  onClose: () => void;
  onSave: (updated: MockEvent) => void;
  onDelete: (eventId: string) => void;
}

export function EditEventModal({ event, visible, onClose, onSave, onDelete }: Props) {
  const { colors } = useTheme();
  const { getToken } = useAuth();

  // Event type
  const [eventType, setEventType] = useState<EventType>(event.type as EventType);

  // Core fields
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? '');

  // Venue fields
  const [venueName, setVenueName] = useState(event.venue.name);
  const [address, setAddress] = useState(event.venue.address);
  const [neighborhood, setNeighborhood] = useState(event.venue.neighborhood ?? '');
  const [city, setCity] = useState(event.venue.city);
  const [venueState, setVenueState] = useState(event.venue.state ?? '');

  // Date / time
  const [specificDate, setSpecificDate] = useState<Date>(new Date(event.startsAt));
  const [isRecurring, setIsRecurring] = useState(event.isRecurring);
  const [recurringDesc, setRecurringDesc] = useState(event.recurringDescription ?? '');
  const [startTime, setStartTime] = useState(dateToTimeString(new Date(event.startsAt)));

  // Other structured fields
  const [coverCharge, setCoverCharge] = useState(event.coverCharge ?? 'Free');
  const [slotDuration, setSlotDuration] = useState(event.slotDuration ?? '');
  const [backline, setBackline] = useState((event.backline ?? []).join(', '));
  const [signupsEnabled, setSignupsEnabled] = useState(event.signupsEnabled);
  const [maxSlots, setMaxSlots] = useState(event.maxSlots != null ? String(event.maxSlots) : '');

  // UI state
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCitySelect(selected: CityOption | null) {
    if (!selected) return;
    setCity(selected.city);
    setVenueState(selected.state);
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!city.trim()) { setError('City is required.'); return; }
    setError(null);
    setLoading(true);
    try {
      const token = await getToken();
      const updated = await apiClient.events.update(
        event.id,
        {
          type: eventType,
          title: sanitize(title),
          description: sanitize(description) || null,
          startsAt: timeStringToIso(specificDate, startTime),
          isRecurring,
          recurringDescription: isRecurring ? sanitize(recurringDesc) : null,
          coverCharge: coverCharge || 'Free',
          slotDuration: sanitize(slotDuration) || null,
          backline: sanitize(backline) ? [sanitize(backline)] : [],
          signupsEnabled,
          maxSlots: maxSlots.trim() ? parseInt(maxSlots.trim(), 10) : null,
          signUpMethod: signupsEnabled ? 'APP' : 'DOOR',
          venue: {
            name: sanitize(venueName),
            address: sanitize(address),
            neighborhood: sanitize(neighborhood) || undefined,
            city,
            state: venueState,
          },
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

  function confirmDelete() {
    Alert.alert(
      'Delete Event',
      'This will permanently remove the event and all sign-ups. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ],
    );
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const token = await getToken();
      await apiClient.events.delete(event.id, token!);
      onDelete(event.id);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete event.');
      setDeleting(false);
    }
  }

  const dateDisplay = specificDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Event</Text>
          <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.gold }]} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color={colors.bg} />
              : <Text style={[styles.saveBtnText, { color: colors.bg }]}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.surface, borderColor: colors.jam }]}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.jam} />
              <Text style={[styles.errorText, { color: colors.jam }]}>{error}</Text>
            </View>
          )}

          {/* Event Type */}
          <Label text="Event Type" colors={colors} />
          <View style={styles.typeGrid}>
            {EVENT_TYPE_OPTIONS.map(({ value: t, label }) => {
              const active = eventType === t;
              const accent = GOLD_TYPES.has(t) ? colors.gold : colors.jam;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, { backgroundColor: colors.surface, borderColor: colors.border }, active && { borderColor: accent, backgroundColor: `${accent}18` }]}
                  onPress={() => setEventType(t)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeBtnText, { color: active ? accent : colors.textSecondary }, active && { fontWeight: '700' }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Title */}
          <Label text="Event Title" required colors={colors} />
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={title} onChangeText={setTitle} placeholder="Event title" placeholderTextColor={colors.textMuted} />

          {/* Venue */}
          <Label text="Venue Name" required colors={colors} />
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={venueName} onChangeText={setVenueName} placeholder="Venue name" placeholderTextColor={colors.textMuted} />

          <Label text="Address" colors={colors} />
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={address} onChangeText={setAddress} placeholder="Street address" placeholderTextColor={colors.textMuted} />

          <Label text="Neighborhood" colors={colors} />
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={neighborhood} onChangeText={setNeighborhood} placeholder="Neighborhood (optional)" placeholderTextColor={colors.textMuted} />

          {/* City */}
          <Label text="City" required colors={colors} />
          <SelectButton
            placeholder="Select a city…"
            value={city ? `${city}${venueState ? `, ${venueState}` : ''}` : ''}
            onPress={() => setShowCityPicker(true)}
            colors={colors}
          />

          {/* Date */}
          <Label text="Date" required colors={colors} />
          <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity style={[styles.toggleOption, !isRecurring && { backgroundColor: colors.gold }]} onPress={() => setIsRecurring(false)} activeOpacity={0.8}>
              <Text style={[styles.toggleText, { color: !isRecurring ? colors.bg : colors.textSecondary }]}>Specific Date</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleOption, isRecurring && { backgroundColor: colors.gold }]} onPress={() => setIsRecurring(true)} activeOpacity={0.8}>
              <Text style={[styles.toggleText, { color: isRecurring ? colors.bg : colors.textSecondary }]}>Recurring</Text>
            </TouchableOpacity>
          </View>

          {!isRecurring ? (
            <SelectButton
              placeholder="Pick a date…"
              value={dateDisplay}
              onPress={() => setShowCalendar(true)}
              icon="calendar-outline"
              colors={colors}
            />
          ) : (
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={recurringDesc}
              onChangeText={setRecurringDesc}
              placeholder="e.g. Every Tuesday"
              placeholderTextColor={colors.textMuted}
            />
          )}

          {/* Start Time */}
          <Label text="Start Time" required colors={colors} />
          <SelectButton
            placeholder="Select a time…"
            value={startTime}
            onPress={() => setShowTimePicker(true)}
            icon="time-outline"
            colors={colors}
          />

          {/* Cover Charge */}
          <Label text="Cover Charge" colors={colors} />
          <ChipSelector options={COVER_CHARGE_OPTIONS} selected={coverCharge} onSelect={setCoverCharge} colors={colors} />

          {/* Slot Duration */}
          <Label text="Slot Duration" colors={colors} />
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={slotDuration} onChangeText={setSlotDuration} placeholder="e.g. 5 min · 3 songs · Open" placeholderTextColor={colors.textMuted} />

          {/* Backline */}
          <Label text="Backline Provided" colors={colors} />
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={backline} onChangeText={setBackline} placeholder="e.g. Drum kit, bass amp, piano" placeholderTextColor={colors.textMuted} />

          {/* Description */}
          <Label text="Description" colors={colors} />
          <TextInput
            style={[styles.input, styles.multiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder="What should performers know?"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Sign-ups toggle */}
          <View style={[styles.switchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.switchLabel}>
              <Text style={[styles.switchLabelText, { color: colors.text }]}>Allow performer sign-ups</Text>
              <Text style={[styles.switchHint, { color: colors.textMuted }]}>Let artists claim slots via the app</Text>
            </View>
            <Switch
              value={signupsEnabled}
              onValueChange={setSignupsEnabled}
              trackColor={{ false: colors.border, true: colors.gold }}
              thumbColor={colors.bg}
            />
          </View>
          {signupsEnabled && (
            <View style={{ marginTop: 12 }}>
              <Label text="Max Slots" colors={colors} />
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={maxSlots}
                onChangeText={setMaxSlots}
                placeholder="Leave blank for unlimited"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
          )}

          {/* Delete button */}
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.jam }]}
            onPress={confirmDelete}
            disabled={deleting}
            activeOpacity={0.8}
          >
            {deleting
              ? <ActivityIndicator size="small" color={colors.jam} />
              : <>
                  <Ionicons name="trash-outline" size={18} color={colors.jam} />
                  <Text style={[styles.deleteBtnText, { color: colors.jam }]}>Delete Event</Text>
                </>
            }
          </TouchableOpacity>
        </ScrollView>
      </View>

      <CityPickerModal
        visible={showCityPicker}
        selectedCity={city ? { city, state: venueState, label: `${city}, ${venueState}` } : null}
        onSelect={handleCitySelect}
        onClose={() => setShowCityPicker(false)}
      />
      <CalendarModal
        visible={showCalendar}
        events={[]}
        selectedDate={specificDate}
        onSelectDate={(date) => setSpecificDate(date)}
        onClose={() => setShowCalendar(false)}
      />
      <TimePickerModal
        visible={showTimePicker}
        selected={startTime}
        onSelect={setStartTime}
        onClose={() => setShowTimePicker(false)}
        colors={colors}
      />
    </Modal>
  );
}

// ─── Label ────────────────────────────────────────────────────────────────────

function Label({ text, required, colors }: { text: string; required?: boolean; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', color: colors.textMuted, marginBottom: 8, marginTop: 16 }}>
      {text}{required && <Text style={{ color: colors.jam }}> *</Text>}
    </Text>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, minWidth: 56, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
  body: { padding: 20, paddingBottom: 48 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, borderWidth: 1, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, flex: 1 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  typeBtnText: { fontSize: 13, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  multiline: { minHeight: 80, paddingTop: 11 },
  toggleRow: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
  toggleOption: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  toggleText: { fontSize: 14, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginTop: 16 },
  switchLabel: { flex: 1, marginRight: 12 },
  switchLabelText: { fontSize: 15, fontWeight: '600' },
  switchHint: { fontSize: 12, marginTop: 2 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32, borderWidth: 1, borderRadius: 12, paddingVertical: 14 },
  deleteBtnText: { fontSize: 15, fontWeight: '700' },
});

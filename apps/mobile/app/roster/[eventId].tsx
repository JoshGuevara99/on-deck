import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Switch,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../../context/ThemeContext';
import { apiClient } from '../../lib/api';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { EventSignup } from '@on-deck/shared';

const STATUS_LABELS: Record<string, string> = {
  SIGNED_UP: 'Up next',
  PERFORMED: 'Done',
  NO_SHOW: 'No show',
  REMOVED: 'Removed',
};

const PERFORMER_TYPE_LABELS: Record<string, string> = {
  MUSICIAN: 'Musician',
  COMEDIAN: 'Comedian',
  POET: 'Poet',
  STORYTELLER: 'Storyteller',
  OTHER: 'Performer',
};

export default function RosterScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { getToken } = useAuth();
  const styles = makeStyles(colors);

  const [signups, setSignups] = useState<EventSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [signupsEnabled, setSignupsEnabled] = useState(true);
  const [togglingSignups, setTogglingSignups] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  // Track order saves in-flight so we don't spam
  const saveOrderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const [data, event] = await Promise.all([
        apiClient.signups.get(eventId!, token ?? undefined),
        apiClient.events.getById(eventId!),
      ]);
      if (Array.isArray(data)) {
        const sorted = [...(data as EventSignup[])].sort(
          (a, b) => (a.slotOrder ?? 0) - (b.slotOrder ?? 0),
        );
        setSignups(sorted);
      }
      setSignupsEnabled(event.signupsEnabled);
      setEventTitle(event.title);
    } catch {
      Alert.alert('Error', 'Could not load the roster.');
    } finally {
      setLoading(false);
    }
  }, [eventId, getToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function markStatus(
    signup: EventSignup,
    status: 'PERFORMED' | 'NO_SHOW' | 'SIGNED_UP',
  ) {
    setUpdating(signup.id);
    try {
      const token = await getToken();
      const updated = await apiClient.signups.update(
        eventId!,
        signup.id,
        { status },
        token!,
      );
      setSignups((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch {
      Alert.alert('Error', 'Could not update the performer status.');
    } finally {
      setUpdating(null);
    }
  }

  async function toggleSignups(value: boolean) {
    setTogglingSignups(true);
    try {
      const token = await getToken();
      await apiClient.events.update(eventId!, { signupsEnabled: value }, token!);
      setSignupsEnabled(value);
    } catch {
      Alert.alert('Error', 'Could not update sign-up settings.');
    } finally {
      setTogglingSignups(false);
    }
  }

  function handleDragEnd({ data }: { data: EventSignup[] }) {
    setSignups(data);
    // Debounce — send PATCH for each signup with its new slotOrder
    if (saveOrderTimer.current) clearTimeout(saveOrderTimer.current);
    saveOrderTimer.current = setTimeout(async () => {
      try {
        const token = await getToken();
        await Promise.all(
          data.map((signup, idx) =>
            apiClient.signups.update(
              eventId!,
              signup.id,
              { slotOrder: idx },
              token!,
            ),
          ),
        );
      } catch {
        Alert.alert('Error', 'Could not save the new order.');
        load(); // reload to restore last-known state
      }
    }, 600);
  }

  const active = signups.filter((s) => s.status !== 'REMOVED');
  const performed = active.filter((s) => s.status === 'PERFORMED').length;
  const remaining = active.filter((s) => s.status === 'SIGNED_UP').length;

  const renderItem = useCallback(
    ({ item: signup, drag, isActive, getIndex }: RenderItemParams<EventSignup>) => {
      const idx = getIndex() ?? 0;
      const name = signup.user.displayName || signup.user.name || 'Anonymous';
      const typeLabel = signup.performerType
        ? (PERFORMER_TYPE_LABELS[signup.performerType] ?? signup.performerType)
        : null;
      const detail = [
        ...(signup.instruments ?? []),
        ...(signup.genres ?? []),
      ].join(', ');

      const isDone = signup.status === 'PERFORMED';
      const isNoShow = signup.status === 'NO_SHOW';

      return (
        <ScaleDecorator activeScale={1.02}>
          <View
            style={[
              styles.row,
              { borderColor: isActive ? colors.gold : colors.border },
              isDone && { opacity: 0.5 },
            ]}
          >
            {/* Drag handle */}
            <TouchableOpacity
              onLongPress={drag}
              delayLongPress={150}
              style={styles.dragHandle}
              accessibilityLabel="Hold to reorder"
            >
              <Ionicons name="reorder-three-outline" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Slot number */}
            <View
              style={[
                styles.slotNum,
                { backgroundColor: isDone ? colors.surface : `${colors.gold}20` },
              ]}
            >
              <Text
                style={[
                  styles.slotNumText,
                  { color: isDone ? colors.textMuted : colors.gold },
                ]}
              >
                {idx + 1}
              </Text>
            </View>

            {/* Avatar */}
            {signup.user.avatarUrl ? (
              <Image
                source={{ uri: signup.user.avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.surface }]}>
                <Text style={[styles.avatarInitial, { color: colors.textMuted }]}>
                  {name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            {/* Name + details */}
            <View style={styles.rowInfo}>
              <Text style={[styles.performerName, { color: colors.text }]}>{name}</Text>
              {typeLabel && (
                <Text style={[styles.performerType, { color: colors.textMuted }]}>
                  {typeLabel}
                </Text>
              )}
              {detail ? (
                <Text
                  style={[styles.performerDetail, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {detail}
                </Text>
              ) : null}
              {signup.note ? (
                <Text
                  style={[
                    styles.note,
                    { color: colors.textMuted, borderColor: colors.border },
                  ]}
                >
                  "{signup.note}"
                </Text>
              ) : null}
            </View>

            {/* Actions */}
            <View style={styles.rowActions}>
              {updating === signup.id ? (
                <ActivityIndicator color={colors.gold} size="small" />
              ) : isDone ? (
                <TouchableOpacity
                  style={[styles.actionChip, { borderColor: colors.border }]}
                  onPress={() => markStatus(signup, 'SIGNED_UP')}
                >
                  <Text style={[styles.actionChipText, { color: colors.textMuted }]}>
                    Undo
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.actionChip,
                      {
                        backgroundColor: `${colors.gold}20`,
                        borderColor: `${colors.gold}50`,
                      },
                    ]}
                    onPress={() => markStatus(signup, 'PERFORMED')}
                  >
                    <Ionicons name="checkmark" size={14} color={colors.gold} />
                    <Text style={[styles.actionChipText, { color: colors.gold }]}>Done</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionChip,
                      {
                        backgroundColor: `${colors.jam}15`,
                        borderColor: `${colors.jam}40`,
                      },
                    ]}
                    onPress={() => markStatus(signup, 'NO_SHOW')}
                  >
                    <Text style={[styles.actionChipText, { color: colors.jam }]}>
                      {isNoShow ? 'No-show' : 'Skip'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </ScaleDecorator>
      );
    },
    [colors, styles, updating, eventId, getToken],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <StatusBar
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.bg}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {eventTitle || 'Roster'}
            </Text>
            <Text style={styles.headerSub}>
              {performed} performed · {remaining} remaining
            </Text>
          </View>
          <TouchableOpacity onPress={load} style={styles.refreshBtn}>
            <Ionicons name="refresh-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sign-ups toggle */}
        <View style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>Sign-ups open</Text>
            <Text style={[styles.toggleSub, { color: colors.textMuted }]}>
              {signupsEnabled ? 'Performers can join the list' : 'List is closed'}
            </Text>
          </View>
          {togglingSignups ? (
            <ActivityIndicator color={colors.gold} size="small" />
          ) : (
            <Switch
              value={signupsEnabled}
              onValueChange={toggleSignups}
              trackColor={{ false: colors.border, true: colors.gold }}
              thumbColor={colors.surface}
            />
          )}
        </View>

        {/* Hint */}
        {active.length > 1 && (
          <Text style={[styles.dragHint, { color: colors.textMuted }]}>
            Long-press the grip icon to reorder
          </Text>
        )}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.gold} size="large" />
          </View>
        ) : active.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="mic-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>No sign-ups yet.</Text>
            <Text style={styles.emptySubText}>
              Share your event so performers can sign up.
            </Text>
          </View>
        ) : (
          <DraggableFlatList
            data={active}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onDragEnd={handleDragEnd}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: 4 },
    refreshBtn: { padding: 4 },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.2,
    },
    headerSub: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 1,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    toggleInfo: { flex: 1 },
    toggleLabel: { fontSize: 14, fontWeight: '600' },
    toggleSub: { fontSize: 12, marginTop: 1 },
    dragHint: {
      fontSize: 11,
      textAlign: 'center',
      paddingVertical: 6,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: 32,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    emptySubText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    list: {
      padding: 16,
      gap: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 10,
      backgroundColor: colors.surfaceHigh,
    },
    dragHandle: {
      padding: 4,
      flexShrink: 0,
    },
    slotNum: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    slotNumText: {
      fontSize: 13,
      fontWeight: '800',
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 8,
      flexShrink: 0,
    },
    avatarFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontSize: 15,
      fontWeight: '700',
    },
    rowInfo: { flex: 1, gap: 2 },
    performerName: { fontSize: 14, fontWeight: '700' },
    performerType: { fontSize: 12, fontWeight: '500' },
    performerDetail: { fontSize: 12 },
    note: {
      fontSize: 12,
      fontStyle: 'italic',
      marginTop: 4,
      paddingTop: 6,
      borderTopWidth: 1,
    },
    rowActions: {
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
      flexShrink: 0,
    },
    actionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 20,
      borderWidth: 1,
    },
    actionChipText: {
      fontSize: 12,
      fontWeight: '700',
    },
  });
}

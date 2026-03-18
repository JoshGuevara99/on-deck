import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
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
import type { EventSignup } from '@on-deck/shared';

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
  const saveOrderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // getToken is stable from Clerk but not memoized — store in a ref so load
  // doesn't change on every render and cause an infinite fetch loop.
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getTokenRef.current();
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
  }, [eventId]); // intentionally omit getToken — using ref above

  useEffect(() => {
    load();
  }, [load]);

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (saveOrderTimer.current) clearTimeout(saveOrderTimer.current);
  }, []);

  function moveSlot(index: number, direction: 'up' | 'down') {
    const newList = [...signups];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[index], newList[swapIdx]] = [newList[swapIdx], newList[index]];
    setSignups(newList);

    if (saveOrderTimer.current) clearTimeout(saveOrderTimer.current);
    saveOrderTimer.current = setTimeout(async () => {
      try {
        const token = await getTokenRef.current();
        await Promise.all(
          newList.map((s, idx) =>
            apiClient.signups.update(eventId!, s.id, { slotOrder: idx }, token!),
          ),
        );
      } catch {
        Alert.alert('Error', 'Could not save the new order.');
        load();
      }
    }, 600);
  }

  async function markStatus(
    signup: EventSignup,
    status: 'PERFORMED' | 'NO_SHOW' | 'SIGNED_UP',
  ) {
    setUpdating(signup.id);
    try {
      const token = await getTokenRef.current();
      const updated = await apiClient.signups.update(eventId!, signup.id, { status }, token!);
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
      const token = await getTokenRef.current();
      await apiClient.events.update(eventId!, { signupsEnabled: value }, token!);
      setSignupsEnabled(value);
    } catch {
      Alert.alert('Error', 'Could not update sign-up settings.');
    } finally {
      setTogglingSignups(false);
    }
  }

  const active = signups.filter((s) => s.status !== 'REMOVED');
  const performed = active.filter((s) => s.status === 'PERFORMED').length;
  const remaining = active.filter((s) => s.status === 'SIGNED_UP').length;

  return (
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
        <FlatList
          data={active}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: signup, index }) => {
            const name = signup.user.displayName || signup.user.name || 'Anonymous';
            const typeLabel = signup.performerType
              ? (PERFORMER_TYPE_LABELS[signup.performerType] ?? signup.performerType)
              : null;
            const detail = [
              ...(signup.instruments ?? []),
              ...(signup.genres ?? []),
            ].join(', ');

            const isDone = signup.status === 'PERFORMED';
            const isSkipped = signup.status === 'NO_SHOW';
            const isInactive = isDone || isSkipped;

            return (
              <View
                style={[
                  styles.row,
                  { borderColor: isInactive ? colors.border : isDone ? `${colors.live}40` : colors.border },
                  isInactive && { opacity: 0.45 },
                ]}
              >
                {/* Up/down reorder */}
                <View style={styles.reorderBtns}>
                  <TouchableOpacity
                    onPress={() => moveSlot(index, 'up')}
                    disabled={index === 0}
                    style={styles.reorderBtn}
                  >
                    <Ionicons
                      name="chevron-up"
                      size={16}
                      color={index === 0 ? colors.border : colors.textMuted}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveSlot(index, 'down')}
                    disabled={index === active.length - 1}
                    style={styles.reorderBtn}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={index === active.length - 1 ? colors.border : colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                {/* Slot number — turns green when done, stays numbered when skipped */}
                <View
                  style={[
                    styles.slotNum,
                    {
                      backgroundColor: isDone
                        ? `${colors.live}25`
                        : `${colors.gold}20`,
                    },
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={14} color={colors.live} />
                  ) : (
                    <Text
                      style={[styles.slotNumText, { color: colors.gold }]}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>

                {/* Avatar */}
                {signup.user.avatarUrl ? (
                  <Image source={{ uri: signup.user.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.avatarInitial, { color: colors.textMuted }]}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                {/* Name + details — flex:1 with minWidth:0 prevents text overflow */}
                <View style={styles.rowInfo}>
                  <Text style={[styles.performerName, { color: colors.text }]} numberOfLines={1}>
                    {name}
                  </Text>
                  {typeLabel && (
                    <Text style={[styles.performerType, { color: colors.textMuted }]} numberOfLines={1}>
                      {typeLabel}
                    </Text>
                  )}
                  {detail ? (
                    <Text style={[styles.performerDetail, { color: colors.textMuted }]} numberOfLines={1}>
                      {detail}
                    </Text>
                  ) : null}
                  {signup.note ? (
                    <Text style={[styles.note, { color: colors.textMuted, borderColor: colors.border }]} numberOfLines={2}>
                      "{signup.note}"
                    </Text>
                  ) : null}
                </View>

                {/* Actions */}
                <View style={styles.rowActions}>
                  {updating === signup.id ? (
                    <ActivityIndicator color={colors.live} size="small" />
                  ) : isInactive ? (
                    <TouchableOpacity
                      style={[styles.actionChip, { borderColor: colors.border }]}
                      onPress={() => markStatus(signup, 'SIGNED_UP')}
                    >
                      <Text style={[styles.actionChipText, { color: colors.textMuted }]}>Undo</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.actionChip,
                          { backgroundColor: `${colors.gold}20`, borderColor: `${colors.gold}50` },
                        ]}
                        onPress={() => markStatus(signup, 'PERFORMED')}
                      >
                        <Ionicons name="checkmark" size={14} color={colors.gold} />
                        <Text style={[styles.actionChipText, { color: colors.gold }]}>Done</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionChip,
                          { borderColor: colors.border },
                        ]}
                        onPress={() => markStatus(signup, 'NO_SHOW')}
                      >
                        <Text style={[styles.actionChipText, { color: colors.textMuted }]}>Skip</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
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
      gap: 8,
      backgroundColor: colors.surfaceHigh,
    },
    reorderBtns: {
      flexShrink: 0,
      alignItems: 'center',
    },
    reorderBtn: {
      padding: 2,
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
    rowInfo: { flex: 1, minWidth: 0, gap: 2 },
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
      flexDirection: 'column',
      gap: 5,
      alignItems: 'stretch',
      flexShrink: 0,
      width: 62,
    },
    actionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    actionChipText: {
      fontSize: 12,
      fontWeight: '700',
    },
  });
}

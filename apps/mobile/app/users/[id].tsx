import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { EventTypeBadge } from '../../components/EventTypeBadge';
import { formatTime } from '../../utils/date';
import { apiClient } from '../../lib/api';
import type { PublicUser } from '@on-deck/shared';
import type { MockEvent } from '../../constants/mock-data';

const PERFORMER_TYPE_LABELS: Record<string, string> = {
  MUSICIAN: 'Musician',
  COMEDIAN: 'Comedian',
  POET: 'Poet',
  STORYTELLER: 'Storyteller',
  OTHER: 'Other',
};

type PerformanceEntry = {
  id: string;
  performerType: string | null;
  genres: string[];
  createdAt: string;
  event: MockEvent;
};

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [user, setUser] = useState<PublicUser | null>(null);
  const [performances, setPerformances] = useState<PerformanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    Promise.all([
      apiClient.users.getById(id),
      apiClient.users.getPerformances(id),
    ]).then(([userData, perfData]) => {
      if (cancelled) return;
      setUser(userData);
      setPerformances(perfData);
    }).catch((err) => {
      if (cancelled) return;
      if (err?.message?.includes('404')) setNotFound(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <ActivityIndicator color={colors.gold} size="large" />
      </SafeAreaView>
    );
  }

  if (notFound || !user) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <Ionicons name="person-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Performer not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.gold, fontSize: 15, fontWeight: '600' }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const displayName = user.displayName || user.name || 'Performer';
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const performerLabel = user.performerType ? PERFORMER_TYPE_LABELS[user.performerType] : null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {displayName}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Avatar + name block */}
        <View style={styles.heroBlock}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}>
              <Text style={[styles.avatarInitials, { color: colors.textSecondary }]}>{initials}</Text>
            </View>
          )}
          <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
          <View style={styles.badgeRow}>
            {performerLabel && (
              <View style={[styles.badge, { backgroundColor: `${colors.gold}20`, borderColor: `${colors.gold}50` }]}>
                <Text style={[styles.badgeText, { color: colors.gold }]}>{performerLabel}</Text>
              </View>
            )}
            {user.performanceCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="mic-outline" size={11} color={colors.textMuted} />
                <Text style={[styles.badgeText, { color: colors.textMuted }]}>
                  {user.performanceCount} performance{user.performanceCount !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.body}>
          {/* Bio */}
          {user.bio ? (
            <Text style={[styles.bio, { color: colors.textSecondary }]}>{user.bio}</Text>
          ) : null}

          {/* Instruments */}
          {user.instruments.length > 0 && (
            <View style={styles.tagSection}>
              <Text style={[styles.tagLabel, { color: colors.textMuted }]}>INSTRUMENTS</Text>
              <View style={styles.tagRow}>
                {user.instruments.map((i) => (
                  <View key={i} style={[styles.tag, { backgroundColor: `${colors.gold}15`, borderColor: `${colors.gold}40` }]}>
                    <Text style={[styles.tagText, { color: colors.gold }]}>{i}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Genres */}
          {user.genres.length > 0 && (
            <View style={styles.tagSection}>
              <Text style={[styles.tagLabel, { color: colors.textMuted }]}>GENRES / STYLE</Text>
              <View style={styles.tagRow}>
                {user.genres.map((g) => (
                  <View key={g} style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.tagText, { color: colors.textSecondary }]}>{g}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Performance history */}
          <View style={styles.historySection}>
            <Text style={[styles.tagLabel, { color: colors.textMuted }]}>
              PERFORMANCE HISTORY · {performances.length}
            </Text>
            {performances.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No recorded performances yet.</Text>
            ) : (
              <View style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {performances.map((p, idx) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.historyRow,
                      { borderBottomColor: colors.border },
                      idx === performances.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => router.push(`/events/${p.event.id}` as any)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.historyLeft}>
                      <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>
                        {p.event.title}
                      </Text>
                      <Text style={[styles.historyMeta, { color: colors.textMuted }]} numberOfLines={1}>
                        {p.event.venue.name} ·{' '}
                        {new Date(p.event.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                      {p.genres.length > 0 && (
                        <Text style={[styles.historyGenres, { color: colors.textMuted }]} numberOfLines={1}>
                          {p.genres.join(', ')}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    centered: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
    emptyText: { fontSize: 14, textAlign: 'center' },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      flex: 1,
      textAlign: 'center',
      marginHorizontal: 8,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    heroBlock: {
      alignItems: 'center',
      paddingTop: 32,
      paddingBottom: 24,
      paddingHorizontal: 20,
      gap: 12,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 18,
    },
    avatarFallback: {
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: {
      fontSize: 32,
      fontWeight: '800',
    },
    displayName: {
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: -0.3,
      textAlign: 'center',
    },
    badgeRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.3,
    },

    body: {
      paddingHorizontal: 20,
      gap: 20,
    },
    bio: {
      fontSize: 15,
      lineHeight: 23,
      textAlign: 'center',
    },
    tagSection: { gap: 10 },
    tagLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
    },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
    },
    tagText: { fontSize: 13, fontWeight: '500' },

    historySection: { gap: 10 },
    historyCard: {
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden',
    },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 12,
    },
    historyLeft: { flex: 1 },
    historyTitle: { fontSize: 14, fontWeight: '600' },
    historyMeta: { fontSize: 12, marginTop: 2 },
    historyGenres: { fontSize: 12, marginTop: 1, fontStyle: 'italic' },
  });
}

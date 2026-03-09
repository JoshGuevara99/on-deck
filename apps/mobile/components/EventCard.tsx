import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { EventTypeBadge } from './EventTypeBadge';
import { formatTime } from '../utils/date';
import type { MockEvent } from '../constants/mock-data';

interface Props {
  event: MockEvent;
  expanded?: boolean;
  onPress?: () => void;
}

export function EventCard({ event, expanded = false, onPress }: Props) {
  const { colors } = useTheme();
  const accentColor =
    event.type === 'OPEN_MIC' || event.type === 'JAM_SESSION' || event.type === 'OPEN_STAGE'
      ? colors.gold
      : colors.jam;

  const hasExpandedContent =
    (event.description && event.description.length > 0) ||
    event.genres.length > 3 ||
    (event.backline && event.backline.length > 0) ||
    event.endsAt ||
    event.venue.instagramHandle;

  const styles = makeStyles(colors);

  return (
    <TouchableOpacity
      style={[styles.card, { borderTopColor: accentColor }]}
      activeOpacity={0.82}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.title} at ${event.venue.name}`}
      accessibilityState={{ expanded }}
    >
      {/* ── Top row: badge + time ─────────────────────── */}
      <View style={styles.topRow}>
        <EventTypeBadge type={event.type} />
        <View style={styles.timeBlock}>
          <Text style={[styles.timeHour, { color: accentColor }]}>
            {formatTime(event.startsAt)}
          </Text>
          {hasExpandedContent && (
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.textMuted}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>
      </View>

      {/* ── Title ─────────────────────────────────────── */}
      <Text style={styles.title}>{event.title}</Text>

      {/* ── Venue ─────────────────────────────────────── */}
      <View style={styles.venueRow}>
        <Text style={styles.venueName}>{event.venue.name.toUpperCase()}</Text>
        {event.venue.neighborhood ? (
          <Text style={styles.neighborhood}> · {event.venue.neighborhood}</Text>
        ) : null}
      </View>

      {/* ── Genres ────────────────────────────────────── */}
      {event.genres.length > 0 && (
        <View style={styles.genreRow}>
          {(expanded ? event.genres : event.genres.slice(0, 3)).map((g) => (
            <Text key={g} style={styles.genre}>{g}</Text>
          ))}
          {!expanded && event.genres.length > 3 && (
            <Text style={styles.genre}>+{event.genres.length - 3}</Text>
          )}
        </View>
      )}

      {/* ── Description ───────────────────────────────── */}
      {event.description ? (
        <Text style={styles.description} numberOfLines={expanded ? undefined : 2}>
          {event.description}
        </Text>
      ) : null}

      {/* ── Expanded detail rows ──────────────────────── */}
      {expanded && (
        <View style={styles.expandedSection}>
          <DetailRow
            icon="time-outline"
            label="Time"
            value={`${formatTime(event.startsAt)}${event.endsAt ? ` – ${formatTime(event.endsAt)}` : ''}`}
            accentColor={accentColor}
            colors={colors}
          />
          <DetailRow
            icon="map-outline"
            label="Address"
            value={event.venue.address}
            accentColor={accentColor}
            colors={colors}
          />
          <DetailRow
            icon="hand-left-outline"
            label="Sign up"
            value={
              event.signUpMethod === 'door' ? 'At the door'
              : event.signUpMethod === 'online' ? 'Online'
              : 'Via app'
            }
            accentColor={accentColor}
            colors={colors}
          />
          {event.slotDuration && (
            <DetailRow
              icon="hourglass-outline"
              label="Slot"
              value={event.slotDuration}
              accentColor={accentColor}
              colors={colors}
            />
          )}
          <DetailRow
            icon={event.coverCharge === 'Free' ? 'gift-outline' : 'cash-outline'}
            label="Cover"
            value={event.coverCharge}
            accentColor={accentColor}
            colors={colors}
          />
          {event.backline && event.backline.length > 0 && (
            <DetailRow
              icon="musical-notes-outline"
              label="Backline"
              value={event.backline.join(', ')}
              accentColor={accentColor}
              colors={colors}
            />
          )}
          {event.isRecurring && event.recurringDescription && (
            <DetailRow
              icon="repeat"
              label="Recurring"
              value={event.recurringDescription}
              accentColor={accentColor}
              colors={colors}
            />
          )}
          {event.venue.instagramHandle && (
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => {
                const handle = event.venue.instagramHandle!.replace(/^@/, '');
                Linking.openURL(`https://instagram.com/${handle}`);
              }}
              accessibilityLabel={`Open ${event.venue.name} on Instagram`}
            >
              <Ionicons name="logo-instagram" size={13} color={accentColor} />
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Instagram</Text>
              <Text style={[styles.detailValue, styles.link]}>
                {event.venue.instagramHandle.startsWith('@')
                  ? event.venue.instagramHandle
                  : `@${event.venue.instagramHandle}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Footer chips (collapsed only) ─────────────── */}
      {!expanded && (
        <View style={styles.footer}>
          {event.isRecurring && event.recurringDescription && (
            <Chip icon="repeat" label={event.recurringDescription} colors={colors} />
          )}
          {event.slotDuration && (
            <Chip icon="time-outline" label={event.slotDuration} colors={colors} />
          )}
          <Chip
            icon={event.coverCharge === 'Free' ? 'gift-outline' : 'cash-outline'}
            label={event.coverCharge}
            colors={colors}
          />
          {event.signUpMethod === 'door' && (
            <Chip icon="hand-left-outline" label="Door" colors={colors} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Chip({
  icon,
  label,
  colors,
}: {
  icon: string;
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={chipStyles.chip}>
      <Ionicons name={icon as any} size={10} color={colors.textMuted} />
      <Text style={[chipStyles.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  accentColor,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  accentColor: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={detailStyles.row}>
      <Ionicons name={icon as any} size={13} color={accentColor} />
      <Text style={[detailStyles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[detailStyles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const chipStyles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontSize: 11, letterSpacing: 0.2 },
});

const detailStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  label: { fontSize: 12, fontWeight: '500', width: 68, flexShrink: 0 },
  value: { fontSize: 12, flex: 1, lineHeight: 18 },
});

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceHigh,
      borderRadius: 6,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderTopWidth: 3,
      padding: 16,
      gap: 10,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    timeBlock: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    timeHour: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
      lineHeight: 27,
    },
    venueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    venueName: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: colors.textSecondary,
    },
    neighborhood: {
      fontSize: 11,
      color: colors.textMuted,
      letterSpacing: 0.3,
    },
    genreRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    genre: {
      fontSize: 11,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    description: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 20,
    },
    expandedSection: {
      gap: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderStyle: 'dashed',
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    detailLabel: {
      fontSize: 12,
      fontWeight: '500',
      width: 68,
      flexShrink: 0,
    },
    detailValue: {
      fontSize: 12,
      flex: 1,
      lineHeight: 18,
    },
    link: {
      color: '#E1306C',
      fontWeight: '600',
    },
    footer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
}

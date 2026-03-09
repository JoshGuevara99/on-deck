import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { EventTypeBadge } from './EventTypeBadge';
import { formatDayLabel, formatTime } from '../utils/date';
import type { MockEvent } from '../constants/mock-data';

interface Props {
  event: MockEvent;
  expanded?: boolean;
  onPress?: () => void;
}

export function EventCard({ event, expanded = false, onPress }: Props) {
  const { colors } = useTheme();
  const accentColor = event.type === 'OPEN_MIC' ? colors.gold : colors.jam;
  const styles = makeStyles(colors);

  const hasExpandedContent =
    (event.description && event.description.length > 0) ||
    event.genres.length > 3 ||
    (event.backline && event.backline.length > 0) ||
    event.endsAt ||
    event.venue.instagramHandle;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.title} at ${event.venue.name}`}
      accessibilityState={{ expanded }}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.content}>
        {/* Badge + time + expand indicator */}
        <View style={styles.headerRow}>
          <EventTypeBadge type={event.type} />
          <View style={styles.headerRight}>
            <Text style={styles.time}>
              {formatDayLabel(event.startsAt)} · {formatTime(event.startsAt)}
            </Text>
            {hasExpandedContent && (
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.textMuted}
                style={styles.chevron}
              />
            )}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{event.title}</Text>

        {/* Venue */}
        <View style={styles.venueRow}>
          <Ionicons name="location-sharp" size={13} color={accentColor} />
          <Text style={styles.venueName}>{event.venue.name}</Text>
          {event.venue.neighborhood ? (
            <>
              <Text style={styles.separator}>·</Text>
              <Text style={styles.neighborhood}>{event.venue.neighborhood}</Text>
            </>
          ) : null}
        </View>

        {/* Genre tags — show all when expanded, max 3 when collapsed */}
        <View style={styles.genreRow}>
          {(expanded ? event.genres : event.genres.slice(0, 3)).map((g) => (
            <View key={g} style={styles.genreTag}>
              <Text style={styles.genreText}>{g}</Text>
            </View>
          ))}
          {!expanded && event.genres.length > 3 && (
            <View style={[styles.genreTag, { borderStyle: 'dashed' }]}>
              <Text style={styles.genreText}>+{event.genres.length - 3}</Text>
            </View>
          )}
        </View>

        {/* Description — 2 lines collapsed, full when expanded */}
        {event.description ? (
          <Text
            style={styles.description}
            numberOfLines={expanded ? undefined : 2}
          >
            {event.description}
          </Text>
        ) : null}

        {/* ── Expanded details ─────────────────────────────── */}
        {expanded && (
          <View style={styles.expandedSection}>
            {/* Time details */}
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={14} color={accentColor} />
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>
                {formatTime(event.startsAt)}
                {event.endsAt ? ` – ${formatTime(event.endsAt)}` : ''}
              </Text>
            </View>

            {/* Full address */}
            <View style={styles.detailRow}>
              <Ionicons name="map-outline" size={14} color={accentColor} />
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{event.venue.address}</Text>
            </View>

            {/* Sign-up method */}
            <View style={styles.detailRow}>
              <Ionicons name="hand-left-outline" size={14} color={accentColor} />
              <Text style={styles.detailLabel}>Sign up</Text>
              <Text style={styles.detailValue}>
                {event.signUpMethod === 'door'
                  ? 'At the door'
                  : event.signUpMethod === 'online'
                  ? 'Online'
                  : 'Via app'}
              </Text>
            </View>

            {/* Slot duration */}
            {event.slotDuration && (
              <View style={styles.detailRow}>
                <Ionicons name="hourglass-outline" size={14} color={accentColor} />
                <Text style={styles.detailLabel}>Slot</Text>
                <Text style={styles.detailValue}>{event.slotDuration}</Text>
              </View>
            )}

            {/* Cover charge */}
            <View style={styles.detailRow}>
              <Ionicons
                name={event.coverCharge === 'Free' ? 'gift-outline' : 'cash-outline'}
                size={14}
                color={accentColor}
              />
              <Text style={styles.detailLabel}>Cover</Text>
              <Text style={styles.detailValue}>{event.coverCharge}</Text>
            </View>

            {/* Backline */}
            {event.backline && event.backline.length > 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="musical-notes-outline" size={14} color={accentColor} />
                <Text style={styles.detailLabel}>Backline</Text>
                <Text style={styles.detailValue}>{event.backline.join(', ')}</Text>
              </View>
            )}

            {/* Recurring */}
            {event.isRecurring && event.recurringDescription && (
              <View style={styles.detailRow}>
                <Ionicons name="repeat" size={14} color={accentColor} />
                <Text style={styles.detailLabel}>Recurring</Text>
                <Text style={styles.detailValue}>{event.recurringDescription}</Text>
              </View>
            )}

            {/* Instagram */}
            {event.venue.instagramHandle && (
              <TouchableOpacity
                style={styles.detailRow}
                onPress={() => {
                  const handle = event.venue.instagramHandle!.replace(/^@/, '');
                  Linking.openURL(`https://instagram.com/${handle}`);
                }}
                accessibilityLabel={`Open ${event.venue.name} on Instagram`}
              >
                <Ionicons name="logo-instagram" size={14} color={accentColor} />
                <Text style={styles.detailLabel}>Instagram</Text>
                <Text style={[styles.detailValue, styles.link]}>
                  {event.venue.instagramHandle.startsWith('@')
                    ? event.venue.instagramHandle
                    : `@${event.venue.instagramHandle}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Footer chips — shown when collapsed only */}
        {!expanded && (
          <View style={styles.footer}>
            {event.isRecurring && event.recurringDescription && (
              <FooterChip icon="repeat" label={event.recurringDescription} color={colors.textMuted} />
            )}
            {event.slotDuration && (
              <FooterChip icon="time-outline" label={event.slotDuration} color={colors.textMuted} />
            )}
            <FooterChip
              icon={event.coverCharge === 'Free' ? 'gift-outline' : 'cash-outline'}
              label={event.coverCharge}
              color={colors.textMuted}
            />
            {event.signUpMethod === 'door' && (
              <FooterChip icon="hand-left-outline" label="Sign up at door" color={colors.textMuted} />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function FooterChip({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={chipStyles.chip}>
      <Ionicons name={icon as any} size={11} color={color} />
      <Text style={[chipStyles.label, { color }]}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 12,
  },
});

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceHigh,
      borderRadius: 16,
      marginBottom: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    accentBar: {
      width: 4,
    },
    content: {
      flex: 1,
      padding: 16,
      gap: 10,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    time: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    chevron: {
      marginLeft: 2,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
      lineHeight: 26,
    },
    venueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
    },
    venueName: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    separator: {
      color: colors.border,
      fontSize: 14,
    },
    neighborhood: {
      fontSize: 14,
      color: colors.textMuted,
    },
    genreRow: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
    },
    genreTag: {
      paddingHorizontal: 9,
      paddingVertical: 3,
      backgroundColor: colors.surface,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    genreText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    description: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 20,
    },
    expandedSection: {
      gap: 10,
      paddingTop: 10,
      marginTop: 2,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    detailLabel: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: '500',
      width: 72,
      flexShrink: 0,
    },
    detailValue: {
      fontSize: 13,
      color: colors.text,
      flex: 1,
      lineHeight: 18,
    },
    link: {
      color: '#E1306C', // Instagram pink
      fontWeight: '600',
    },
    footer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      paddingTop: 10,
      marginTop: 2,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
}

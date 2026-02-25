import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { EventTypeBadge } from './EventTypeBadge';
import { formatDayLabel, formatTime } from '../utils/date';
import type { MockEvent } from '../constants/mock-data';

interface Props {
  event: MockEvent;
  onPress?: () => void;
}

export function EventCard({ event, onPress }: Props) {
  const { colors } = useTheme();
  const accentColor = event.type === 'OPEN_MIC' ? colors.gold : colors.jam;
  const styles = makeStyles(colors);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.title} at ${event.venue.name}`}
    >
      {/* Left accent bar — color-coded by event type */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.content}>
        {/* Badge + time */}
        <View style={styles.headerRow}>
          <EventTypeBadge type={event.type} />
          <Text style={styles.time}>
            {formatDayLabel(event.startsAt)} · {formatTime(event.startsAt)}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{event.title}</Text>

        {/* Venue */}
        <View style={styles.venueRow}>
          <Ionicons name="location-sharp" size={13} color={accentColor} />
          <Text style={styles.venueName}>{event.venue.name}</Text>
          <Text style={styles.separator}>·</Text>
          <Text style={styles.neighborhood}>{event.venue.neighborhood}</Text>
        </View>

        {/* Genre tags */}
        <View style={styles.genreRow}>
          {event.genres.slice(0, 3).map((g) => (
            <View key={g} style={styles.genreTag}>
              <Text style={styles.genreText}>{g}</Text>
            </View>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {event.description}
        </Text>

        {/* Footer — the details musicians actually care about */}
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
    time: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
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

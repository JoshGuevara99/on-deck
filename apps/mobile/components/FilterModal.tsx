import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export interface ExtraFilters {
  tonightOnly: boolean;
  freeOnly: boolean;
}

interface Props {
  visible: boolean;
  filters: ExtraFilters;
  onChange: (filters: ExtraFilters) => void;
  onClose: () => void;
}

export function FilterModal({ visible, filters, onChange, onClose }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  function toggle(key: keyof ExtraFilters) {
    onChange({ ...filters, [key]: !filters[key] });
  }

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <Text style={styles.heading}>Filter Events</Text>

        <FilterRow
          label="Tonight only"
          description="Show events happening today"
          value={filters.tonightOnly}
          onToggle={() => toggle('tonightOnly')}
          trackColor={colors.gold}
          colors={colors}
        />

        <FilterRow
          label="Free admission"
          description="No cover charge required"
          value={filters.freeOnly}
          onToggle={() => toggle('freeOnly')}
          trackColor={colors.gold}
          colors={colors}
        />

        <View style={styles.actions}>
          {activeCount > 0 && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => onChange({ tonightOnly: false, freeOnly: false })}
              activeOpacity={0.7}
              accessibilityLabel="Clear all filters"
            >
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: colors.gold }]}
            onPress={onClose}
            activeOpacity={0.85}
            accessibilityLabel="Apply filters"
          >
            <Text style={[styles.applyText, { color: colors.bg }]}>
              {activeCount > 0 ? `Apply (${activeCount})` : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function FilterRow({
  label,
  description,
  value,
  onToggle,
  trackColor,
  colors,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  trackColor: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const styles = makeRowStyles(colors);
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: trackColor }}
        thumbColor={colors.surface}
        accessibilityLabel={label}
      />
    </View>
  );
}

function makeRowStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowText: {
      flex: 1,
      marginRight: 16,
    },
    rowLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    rowDesc: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
  });
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 20,
    },
    heading: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 8,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    clearBtn: {
      flex: 1,
      paddingVertical: 15,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    clearText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    applyBtn: {
      flex: 2,
      paddingVertical: 15,
      borderRadius: 14,
      alignItems: 'center',
    },
    applyText: {
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
  });
}

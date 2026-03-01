import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { PRESET_CITIES, type CityOption } from '../constants/cities';

interface Props {
  visible: boolean;
  selectedCity: CityOption | null;
  onSelect: (city: CityOption | null) => void;
  onClose: () => void;
}

export function CityPickerModal({ visible, selectedCity, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  function handleSelect(city: CityOption | null) {
    onSelect(city);
    onClose();
  }

  const allSelected = selectedCity === null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.headingRow}>
          <Text style={styles.heading}>Choose City</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* All Cities chip */}
        <TouchableOpacity
          style={[styles.allChip, allSelected && { borderColor: colors.gold, backgroundColor: `${colors.gold}18` }]}
          onPress={() => handleSelect(null)}
          activeOpacity={0.75}
          accessibilityLabel="All cities"
        >
          <Ionicons
            name="globe-outline"
            size={15}
            color={allSelected ? colors.gold : colors.textSecondary}
          />
          <Text style={[styles.allChipText, allSelected && { color: colors.gold, fontWeight: '700' }]}>
            All Cities
          </Text>
          {allSelected && <Ionicons name="checkmark" size={15} color={colors.gold} />}
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Popular Cities</Text>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
          <View style={styles.grid}>
            {PRESET_CITIES.map((city) => {
              const active = selectedCity?.city === city.city;
              return (
                <TouchableOpacity
                  key={city.city}
                  style={[
                    styles.chip,
                    active && { borderColor: colors.gold, backgroundColor: `${colors.gold}18` },
                  ]}
                  onPress={() => handleSelect(city)}
                  activeOpacity={0.75}
                  accessibilityLabel={city.label}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && { color: colors.gold, fontWeight: '700' }]}>
                    {city.label}
                  </Text>
                  {active && <Ionicons name="checkmark" size={13} color={colors.gold} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
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
      paddingBottom: 48,
      borderTopWidth: 1,
      borderColor: colors.border,
      maxHeight: '75%',
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 20,
    },
    headingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    heading: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    allChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      marginBottom: 20,
    },
    allChipText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginBottom: 12,
    },
    scroll: {
      flexGrow: 0,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
      backgroundColor: colors.bg,
    },
    chipText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
  });
}

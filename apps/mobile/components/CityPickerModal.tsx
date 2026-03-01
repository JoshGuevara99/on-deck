import { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
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
  const [query, setQuery] = useState('');

  function handleSelect(city: CityOption | null) {
    onSelect(city);
    setQuery('');
    onClose();
  }

  function handleClose() {
    setQuery('');
    onClose();
  }

  const trimmed = query.trim();

  const results = useMemo(() => {
    if (!trimmed) return PRESET_CITIES;
    const q = trimmed.toLowerCase();
    return PRESET_CITIES.filter(
      (c) => c.city.toLowerCase().includes(q) || c.label.toLowerCase().includes(q),
    );
  }, [trimmed]);

  // Offer a custom "use whatever they typed" option when there are no preset matches
  const showCustomOption = trimmed.length > 0 && results.length === 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.headingRow}>
          <Text style={styles.heading}>Search City</Text>
          <TouchableOpacity onPress={handleClose} accessibilityLabel="Close" hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Search input */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="e.g. Austin, Chicago, Seattle…"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search for a city"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Results list */}
        <ScrollView
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* All Cities — only show when search is empty */}
          {!trimmed && (
            <CityRow
              label="All Cities"
              sublabel="Show events from everywhere"
              icon="globe-outline"
              active={selectedCity === null}
              onPress={() => handleSelect(null)}
              colors={colors}
            />
          )}

          {results.map((city) => (
            <CityRow
              key={city.city}
              label={city.label}
              icon="location-outline"
              active={selectedCity?.city === city.city}
              onPress={() => handleSelect(city)}
              colors={colors}
            />
          ))}

          {/* Custom city fallback */}
          {showCustomOption && (
            <CityRow
              label={`Use "${trimmed}"`}
              sublabel="Search events in this city"
              icon="search-outline"
              active={false}
              onPress={() =>
                handleSelect({ city: trimmed, label: trimmed })
              }
              colors={colors}
            />
          )}

          {/* No results at all */}
          {!showCustomOption && trimmed && results.length === 0 && (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No cities found</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function CityRow({
  label,
  sublabel,
  icon,
  active,
  onPress,
  colors,
}: {
  label: string;
  sublabel?: string;
  icon: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <TouchableOpacity
      style={[
        rowStyles.row,
        { borderBottomColor: colors.border },
        active && { backgroundColor: `${colors.gold}10` },
      ]}
      onPress={onPress}
      activeOpacity={0.65}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Ionicons
        name={icon as any}
        size={18}
        color={active ? colors.gold : colors.textMuted}
        style={rowStyles.icon}
      />
      <View style={rowStyles.text}>
        <Text
          style={[
            rowStyles.label,
            { color: active ? colors.gold : colors.text },
            active && { fontWeight: '700' },
          ]}
        >
          {label}
        </Text>
        {sublabel && (
          <Text style={[rowStyles.sublabel, { color: colors.textMuted }]}>{sublabel}</Text>
        )}
      </View>
      {active && <Ionicons name="checkmark" size={18} color={colors.gold} />}
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    marginRight: 14,
  },
  text: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
  sublabel: {
    fontSize: 12,
    marginTop: 1,
  },
});

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
      paddingTop: 16,
      paddingHorizontal: 24,
      paddingBottom: 48,
      borderTopWidth: 1,
      borderColor: colors.border,
      maxHeight: '80%',
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 18,
    },
    headingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    heading: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.bg,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    list: {
      flexGrow: 0,
    },
    empty: {
      paddingVertical: 32,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
    },
  });
}

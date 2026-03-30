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
    if (!trimmed) return [];
    const q = trimmed.toLowerCase();
    const matched = PRESET_CITIES.filter(
      (c) => c.city.toLowerCase().includes(q) || c.label.toLowerCase().includes(q),
    );
    // Sort: starts-with first, then contains
    return matched.sort((a, b) => {
      const aStarts = a.city.toLowerCase().startsWith(q);
      const bStarts = b.city.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.city.localeCompare(b.city);
    });
  }, [trimmed]);

  // Offer a custom "use whatever they typed" option when there are no preset matches
  const showCustomOption = trimmed.length > 0 && results.length === 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>


        {/* Search input */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search cities…"
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
          {/* Empty state — no query yet */}
          {!trimmed && (
            <View style={styles.hint}>
              <Ionicons name="location-outline" size={28} color={colors.border} />
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                Type to search cities
              </Text>
            </View>
          )}

          {results.map((city) => (
            <CityRow
              key={city.label}
              label={city.label}
              icon="location-outline"
              active={selectedCity?.label === city.label}
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
              onPress={() => handleSelect({ city: trimmed, state: '', label: trimmed })}
              colors={colors}
            />
          )}
        </ScrollView>
        </Pressable>
      </Pressable>
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
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    sheet: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingTop: 20,
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      maxHeight: '75%',
    },
    handle: {
      display: 'none',
    } as any,
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.bg,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 4,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    list: {
      flexGrow: 0,
    },
    hint: {
      paddingVertical: 36,
      alignItems: 'center',
      gap: 10,
    },
    hintText: {
      fontSize: 14,
    },
  });
}

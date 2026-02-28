import { View, Text, StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

// react-native-maps does not support web — gate the import at the module level
// via a platform-specific lazy approach so Metro doesn't choke on web bundles.
let MapView: React.ComponentType<any> | null = null;
let Marker: React.ComponentType<any> | null = null;
if (Platform.OS !== 'web') {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
}

// Astoria, Queens, NY
const ASTORIA: { latitude: number; longitude: number } = {
  latitude: 40.7721,
  longitude: -73.9302,
};

const INITIAL_REGION = {
  ...ASTORIA,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export default function MapScreen() {
  const { colors, theme } = useTheme();

  if (Platform.OS === 'web' || MapView === null || Marker === null) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={styles.body}>
          <Text style={[styles.fallback, { color: colors.textMuted }]}>
            Map view is not available on web.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Nearby</Text>
      </View>
      <MapView style={styles.map} initialRegion={INITIAL_REGION}>
        <Marker coordinate={ASTORIA} title="Astoria" description="Queens, NY" />
      </MapView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  map: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  fallback: {
    fontSize: 15,
    textAlign: 'center',
  },
});

import MapView, { Marker } from 'react-native-maps';
import { StyleSheet } from 'react-native';

const ASTORIA = { latitude: 40.7721, longitude: -73.9302 };

const INITIAL_REGION = {
  ...ASTORIA,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export default function PlatformMap() {
  return (
    <MapView style={styles.map} initialRegion={INITIAL_REGION}>
      <Marker coordinate={ASTORIA} title="Astoria" description="Queens, NY" />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});

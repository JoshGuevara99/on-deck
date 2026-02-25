import { Text, View, StyleSheet } from 'react-native';
import type { EventType } from '@on-deck/shared';

// Demonstrates @on-deck/shared import works
const EVENT_TYPES: EventType[] = ['OPEN_MIC', 'JAM_SESSION'];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>On Deck</Text>
      <Text style={styles.subtitle}>Find open mics and jam sessions near you.</Text>
      <Text style={styles.meta}>Event types: {EVENT_TYPES.join(', ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  meta: {
    fontSize: 12,
    color: '#888',
  },
});

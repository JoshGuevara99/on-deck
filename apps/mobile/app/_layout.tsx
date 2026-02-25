import { Stack } from 'expo-router';
import { ThemeProvider } from '../context/ThemeContext';
import { EventsProvider } from '../context/EventsContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <EventsProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </EventsProvider>
    </ThemeProvider>
  );
}

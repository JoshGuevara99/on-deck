import { Stack } from 'expo-router';
import { ThemeProvider } from '../context/ThemeContext';
import { EventsProvider } from '../context/EventsContext';
import { ClerkProvider } from '@clerk/clerk-expo'
import { tokenCache } from '@clerk/clerk-expo/token-cache'

export default function RootLayout() {
  return (
    <ThemeProvider>
       <ClerkProvider tokenCache={tokenCache}>
      <EventsProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(home)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </EventsProvider>
      </ClerkProvider>
    </ThemeProvider>
  );
}

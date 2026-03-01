import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { ThemeProvider } from '../context/ThemeContext';
import { LocationProvider } from '../context/LocationContext';
import { EventsProvider } from '../context/EventsContext';
import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { apiClient } from '../lib/api';

function UserSyncEffect() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isSignedIn || !user) return;
    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) return;

    getToken().then((token) => {
      if (!token) return;
      apiClient.users.sync(token, {
        email,
        name: user.fullName ?? undefined,
      }).catch((err) => console.warn('User sync failed:', err));
    });
  }, [isSignedIn, user?.id]);

  return null;
}

function AppShell() {
  return (
    <>
      <UserSyncEffect />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(home)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ClerkProvider tokenCache={tokenCache}>
        <LocationProvider>
          <EventsProvider>
            <AppShell />
          </EventsProvider>
        </LocationProvider>
      </ClerkProvider>
    </ThemeProvider>
  );
}

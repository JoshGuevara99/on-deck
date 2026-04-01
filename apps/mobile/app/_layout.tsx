import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { LocationProvider } from '../context/LocationContext';
import { EventsProvider } from '../context/EventsContext';
import { AttendingProvider } from '../context/AttendingContext';
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
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

function GradientRoot({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <LinearGradient
      colors={colors.bgGradient as [string, string, ...string[]]}
      style={{ flex: 1 }}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <GradientRoot>
        <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!} tokenCache={Platform.OS === 'web' ? undefined : tokenCache}>
          <LocationProvider>
            <EventsProvider>
              <AttendingProvider>
                <AppShell />
              </AttendingProvider>
            </EventsProvider>
          </LocationProvider>
        </ClerkProvider>
      </GradientRoot>
    </ThemeProvider>
  );
}

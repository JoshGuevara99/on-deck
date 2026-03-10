import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          borderRadius: 32,
          height: 64,
          backgroundColor: colors.surfaceHigh,
          borderWidth: 1,
          borderColor: colors.border,
          elevation: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.4,
          shadowRadius: 24,
        },
        tabBarItemStyle: {
          paddingVertical: 10,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="compass" size={24} color={color} />,
          tabBarAccessibilityLabel: 'Discover',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="map" size={24} color={color} />,
          tabBarAccessibilityLabel: 'Map',
        }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={28} color={color} />,
          tabBarAccessibilityLabel: 'Submit',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={24} color={color} />,
          tabBarAccessibilityLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}

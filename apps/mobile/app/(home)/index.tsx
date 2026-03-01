import { SignOutButton } from '../../components/SignOutButton'
import { SignedIn, SignedOut, useSession, useUser } from '@clerk/clerk-expo'
import { Link } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../context/ThemeContext'

export default function Page() {
  const { user } = useUser()
  const { colors } = useTheme()

  const { session } = useSession()
  console.log(session?.currentTask)

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>Welcome!</Text>
      <SignedOut>
        <Link href="/(auth)/sign-in">
          <Text style={{ color: colors.gold }}>Sign in</Text>
        </Link>
        <Link href="/(auth)/sign-up">
          <Text style={{ color: colors.gold }}>Sign up</Text>
        </Link>
      </SignedOut>
      <SignedIn>
        <Text style={{ color: colors.textSecondary }}>
          Hello {user?.emailAddresses[0].emailAddress}
        </Text>
        <SignOutButton />
      </SignedIn>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
})

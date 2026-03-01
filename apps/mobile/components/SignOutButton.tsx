import { useClerk } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import { useTheme } from '../context/ThemeContext'

export const SignOutButton = () => {
  const { signOut } = useClerk()
  const router = useRouter()
  const { colors } = useTheme()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.replace('/')
    } catch (err) {
      console.error(JSON.stringify(err, null, 2))
    }
  }

  return (
    <TouchableOpacity style={[styles.button, { borderColor: colors.border }]} onPress={handleSignOut}>
      <Text style={[styles.text, { color: colors.jam }]}>Sign out</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
    fontSize: 14,
  },
})

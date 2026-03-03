import { useSignUp } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'
import * as React from 'react'
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useTheme } from '../../context/ThemeContext'

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const router = useRouter()
  const { colors } = useTheme()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [pendingVerification, setPendingVerification] = React.useState(false)
  const [code, setCode] = React.useState('')
  const [error, setError] = React.useState('')

  const onSignUpPress = async () => {
    if (!isLoaded) return

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setError('')
    try {
      await signUp.create({ emailAddress, password })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setPendingVerification(true)
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message ?? 'Something went wrong.'
      setError(msg)
      console.error(JSON.stringify(err, null, 2))
    }
  }

  const onVerifyPress = async () => {
    if (!isLoaded) return

    setError('')
    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({ code })

      if (signUpAttempt.status === 'complete') {
        await setActive({
          session: signUpAttempt.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) return
            router.replace('/')
          },
        })
      } else {
        console.error(JSON.stringify(signUpAttempt, null, 2))
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message ?? 'Verification failed.'
      setError(msg)
      console.error(JSON.stringify(err, null, 2))
    }
  }

  if (pendingVerification) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>Verify your email</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          A verification code has been sent to your email.
        </Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          value={code}
          placeholder="Enter your verification code"
          placeholderTextColor={colors.textMuted}
          onChangeText={setCode}
          keyboardType="numeric"
        />
        {error ? <Text style={[styles.errorText, { color: colors.jam }]}>{error}</Text> : null}
        <Pressable
          style={({ pressed }) => [styles.button, { backgroundColor: colors.gold }, pressed && styles.buttonPressed]}
          onPress={onVerifyPress}
        >
          <Text style={styles.buttonText}>Verify</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>Sign up</Text>
      <Text style={[styles.label, { color: colors.text }]}>Email address</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
        autoCapitalize="none"
        value={emailAddress}
        placeholder="Enter email"
        placeholderTextColor={colors.textMuted}
        onChangeText={setEmailAddress}
        keyboardType="email-address"
      />
      <Text style={[styles.label, { color: colors.text }]}>Password</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
        value={password}
        placeholder="8+ characters"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        onChangeText={(val) => {
          setPassword(val)
          if (error) setError('')
        }}
      />
      {error ? <Text style={[styles.errorText, { color: colors.jam }]}>{error}</Text> : null}
      {/* Required by Clerk for CAPTCHA bot protection on web */}
      {Platform.OS === 'web' && <div id="clerk-captcha" />}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.gold },
          (!emailAddress || !password) && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        onPress={onSignUpPress}
        disabled={!emailAddress || !password}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
      <View style={styles.linkContainer}>
        <Text style={{ color: colors.textSecondary }}>Have an account? </Text>
        <Link href="/(auth)/sign-in">
          <Text style={{ color: colors.gold }}>Sign in</Text>
        </Link>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  linkContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 12,
    alignItems: 'center',
  },
})

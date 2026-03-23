import { useSignIn } from '@clerk/clerk-expo'
import type { EmailCodeFactor } from '@clerk/types'
import { Link, useRouter } from 'expo-router'
import * as React from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../context/ThemeContext'

export default function SignInPage() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()
  const { colors } = useTheme()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [code, setCode] = React.useState('')
  const [showEmailCode, setShowEmailCode] = React.useState(false)
  const [error, setError] = React.useState('')

  const onSignInPress = React.useCallback(async () => {
    if (!isLoaded) return
    setError('')

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      })

      if (signInAttempt.status === 'complete') {
        await setActive({
          session: signInAttempt.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) return
            router.replace('/')
          },
        })
      } else if (signInAttempt.status === 'needs_second_factor') {
        const emailCodeFactor = signInAttempt.supportedSecondFactors?.find(
          (factor): factor is EmailCodeFactor => factor.strategy === 'email_code',
        )

        if (emailCodeFactor) {
          await signIn.prepareSecondFactor({
            strategy: 'email_code',
            emailAddressId: emailCodeFactor.emailAddressId,
          })
          setShowEmailCode(true)
        }
      } else {
        setError('Sign in failed. Please try again.')
      }
    } catch (err: any) {
      const message = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? 'Sign in failed. Please try again.'
      setError(message)
    }
  }, [isLoaded, signIn, setActive, router, emailAddress, password])

  const onVerifyPress = React.useCallback(async () => {
    if (!isLoaded) return
    setError('')

    try {
      const signInAttempt = await signIn.attemptSecondFactor({
        strategy: 'email_code',
        code,
      })

      if (signInAttempt.status === 'complete') {
        await setActive({
          session: signInAttempt.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) return
            router.replace('/')
          },
        })
      } else {
        setError('Verification failed. Please try again.')
      }
    } catch (err: any) {
      const message = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? 'Verification failed. Please try again.'
      setError(message)
    }
  }, [isLoaded, signIn, setActive, router, code])

  if (showEmailCode) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>Verify your email</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          A verification code has been sent to your email.
        </Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
          value={code}
          placeholder="Enter verification code"
          placeholderTextColor={colors.textMuted}
          onChangeText={(v) => { setCode(v); setError('') }}
          keyboardType="numeric"
        />
        {!!error && <Text style={[styles.errorText, { color: colors.jam }]}>{error}</Text>}
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
      {router.canGoBack() && (
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
        </Pressable>
      )}
      <Text style={[styles.title, { color: colors.text }]}>Sign in</Text>
      <Text style={[styles.label, { color: colors.text }]}>Email address</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
        autoCapitalize="none"
        value={emailAddress}
        placeholder="Enter email"
        placeholderTextColor={colors.textMuted}
        onChangeText={(v) => { setEmailAddress(v); setError('') }}
        keyboardType="email-address"
      />
      <Text style={[styles.label, { color: colors.text }]}>Password</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
        value={password}
        placeholder="Enter password"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        onChangeText={(v) => { setPassword(v); setError('') }}
      />
      {!!error && <Text style={[styles.errorText, { color: colors.jam }]}>{error}</Text>}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.gold },
          (!emailAddress || !password) && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        onPress={onSignInPress}
        disabled={!emailAddress || !password}
      >
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable>
      <View style={styles.linkContainer}>
        <Text style={{ color: colors.textSecondary }}>Don't have an account? </Text>
        <Link href="/(auth)/sign-up">
          <Text style={{ color: colors.gold }}>Sign up</Text>
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  backText: {
    fontSize: 15,
    fontWeight: '500',
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

import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useUser } from '@/src/state/userStore';
import { LogoMark } from '@/src/components/Logo';
import PrimaryButton from '@/src/components/PrimaryButton';

export default function SignInScreen() {
  const { theme } = useTheme();
  const { signInWithEmail, signInWithGoogle } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    setLoading(true);
    const res = await signInWithEmail(email, password);
    setLoading(false);
    if (res.success) {
      router.replace('/(tabs)');
    } else if (res.error === 'verify-required') {
      router.replace('/auth/verify');
    } else {
      setError(res.error);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient colors={theme.gradientHero} style={{ paddingBottom: 40 }}>
        <SafeAreaView edges={['top']}>
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginBottom: 16 }}>
              <Ionicons name="close" size={26} color="#FFF" />
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <LogoMark size={48} />
              <View>
                <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }}>
                  Welcome back
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 13, marginTop: 2 }}>
                  Sign in to Jade Pavilion
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <Field
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
        />

        {error ? (
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              padding: 12,
              borderRadius: 10,
              backgroundColor: '#DC262618',
              borderLeftWidth: 3,
              borderLeftColor: '#DC2626',
              marginTop: 4,
              marginBottom: 12,
            }}
          >
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        <PrimaryButton
          label={loading ? 'Signing in…' : 'Sign In'}
          size="lg"
          onPress={handleSignIn}
          disabled={loading}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
          <Text style={{ color: theme.textSubtle, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>
            OR
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
        </View>

        <Pressable
          onPress={handleGoogle}
          disabled={loading}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          {loading ? (
            <ActivityIndicator color={theme.text} />
          ) : (
            <>
              <Ionicons name="logo-google" size={18} color={theme.text} />
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>
                Continue with Google
              </Text>
            </>
          )}
        </Pressable>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24, gap: 6 }}>
          <Text style={{ color: theme.textSubtle, fontSize: 14 }}>New here?</Text>
          <Pressable onPress={() => router.replace('/auth/sign-up')}>
            <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '800' }}>Create account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: theme.textSubtle, fontSize: 12, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textSubtle}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        style={{
          backgroundColor: theme.surface,
          color: theme.text,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
        }}
      />
    </View>
  );
}

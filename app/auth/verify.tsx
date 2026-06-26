import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useUser } from '@/src/state/userStore';
import PrimaryButton from '@/src/components/PrimaryButton';

export default function VerifyScreen() {
  const { theme } = useTheme();
  const { pendingVerification, verifyEmailCode, resendVerification } = useUser();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!pendingVerification) router.replace('/auth/sign-up');
  }, [pendingVerification, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleVerify = async () => {
    setError(null);
    setLoading(true);
    const res = await verifyEmailCode(code);
    setLoading(false);
    if (res.success) router.replace('/(tabs)');
    else setError(res.error ?? 'Invalid code');
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    await resendVerification();
    setResendCooldown(30);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient colors={theme.gradientHero} style={{ paddingBottom: 40 }}>
        <SafeAreaView edges={['top']}>
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginBottom: 16 }}>
              <Ionicons name="chevron-back" size={26} color="#FFF" />
            </Pressable>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Ionicons name="mail-open" size={28} color={theme.gold} />
            </View>
            <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.4 }}>
              Check your inbox
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 14, marginTop: 6, lineHeight: 20 }}>
              We sent a 6-digit code to{'\n'}
              <Text style={{ fontWeight: '800', color: theme.gold }}>
                {pendingVerification?.email ?? 'your email'}
              </Text>
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Demo helper – shows the mock code so reviewers can complete the flow */}
        {pendingVerification ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 12,
              borderRadius: 10,
              backgroundColor: theme.gold + '18',
              borderLeftWidth: 3,
              borderLeftColor: theme.gold,
              marginBottom: 18,
            }}
          >
            <Ionicons name="information-circle" size={18} color={theme.gold} />
            <Text style={{ color: theme.text, fontSize: 12, flex: 1, lineHeight: 17 }}>
              Demo mode: your verification code is{' '}
              <Text style={{ fontWeight: '800', color: theme.text }}>{pendingVerification.token}</Text>
            </Text>
          </View>
        ) : null}

        <Text style={{ color: theme.textSubtle, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 }}>
          VERIFICATION CODE
        </Text>
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
          placeholder="• • • • • •"
          placeholderTextColor={theme.textSubtle}
          keyboardType="number-pad"
          maxLength={6}
          style={{
            backgroundColor: theme.surface,
            color: theme.text,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 16,
            fontSize: 22,
            letterSpacing: 8,
            textAlign: 'center',
            fontWeight: '800',
          }}
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
              marginTop: 14,
            }}
          >
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ marginTop: 22 }}>
          <PrimaryButton
            label={loading ? 'Verifying…' : 'Verify & continue'}
            size="lg"
            onPress={handleVerify}
            disabled={loading || code.length !== 6}
          />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24 }}>
          <Text style={{ color: theme.textSubtle, fontSize: 14 }}>Did not receive it?</Text>
          <Pressable onPress={handleResend} disabled={resendCooldown > 0}>
            <Text
              style={{
                color: resendCooldown > 0 ? theme.textSubtle : theme.primary,
                fontSize: 14,
                fontWeight: '800',
              }}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </Text>
          </Pressable>
        </View>

        <Text
          style={{
            color: theme.textSubtle,
            fontSize: 11,
            textAlign: 'center',
            marginTop: 18,
            lineHeight: 16,
          }}
        >
          Code expires 24 hours after sending. By verifying you confirm ownership of this email.
        </Text>
      </ScrollView>
    </View>
  );
}

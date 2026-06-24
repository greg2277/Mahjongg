import React, { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useSession } from '@/lib/auth-client';
import PrimaryButton from '@/src/components/PrimaryButton';

export default function VerifyScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as { email?: string; emailVerified?: boolean } | undefined;

  // Once Better-Auth reports the email as verified, continue into the app.
  useEffect(() => {
    if (user?.emailVerified) router.replace('/(tabs)');
  }, [user?.emailVerified, router]);

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
              Verify your email
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 14, marginTop: 6, lineHeight: 20 }}>
              We sent a verification link to{'\n'}
              <Text style={{ fontWeight: '800', color: theme.gold }}>
                {user?.email ?? 'your email'}
              </Text>
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ color: theme.text, fontSize: 14, lineHeight: 21 }}>
          Open the email and tap the verification link to activate your account. This screen will
          continue automatically once your email is confirmed.
        </Text>

        <View style={{ marginTop: 22 }}>
          <PrimaryButton
            label="I've verified — continue"
            size="lg"
            onPress={() => {
              if (user?.emailVerified) router.replace('/(tabs)');
              else router.replace('/auth/sign-in');
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24 }}>
          <Text style={{ color: theme.textSubtle, fontSize: 14 }}>Wrong account?</Text>
          <Pressable onPress={() => router.replace('/auth/sign-in')}>
            <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '800' }}>Back to sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

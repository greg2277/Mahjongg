import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeProvider';
import { LogoMark } from '@/src/components/Logo';
import PrimaryButton from '@/src/components/PrimaryButton';

export default function WelcomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient
        colors={theme.gradientHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 32, justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <LogoMark size={88} />
              <Text
                style={{
                  color: '#FFF',
                  fontSize: 28,
                  fontWeight: '800',
                  letterSpacing: -0.5,
                  marginTop: 24,
                  textAlign: 'center',
                }}
              >
                Master American{'\n'}Mahjong
              </Text>
              <Text
                style={{
                  color: theme.gold,
                  fontSize: 11,
                  fontWeight: '800',
                  letterSpacing: 2,
                  marginTop: 8,
                }}
              >
                NMJL · CHARLESTON · JOKERS
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.82)',
                  fontSize: 14,
                  textAlign: 'center',
                  marginTop: 18,
                  lineHeight: 21,
                  paddingHorizontal: 12,
                }}
              >
                Lessons, drills, and live 4-player tables for the National Mah Jongg League card.
              </Text>
            </View>

            <View style={{ gap: 14, marginBottom: 8 }}>
              <Feature icon="school" text="3-tier curriculum" />
              <Feature icon="game-controller" text="6 mini-game trainers" />
              <Feature icon="people" text="Real-time 4-player matches" />
            </View>

            <View style={{ gap: 10 }}>
              <PrimaryButton
                label="Create account"
                size="lg"
                onPress={() => router.push('/auth/sign-up')}
              />
              <Pressable
                onPress={() => router.push('/auth/sign-in')}
                style={{
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.18)',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>I already have an account</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

function Feature({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.14)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={18} color="#FFD789" />
      </View>
      <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

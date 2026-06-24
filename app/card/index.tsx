import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeProvider';
import { CardReference } from '@/src/components/CardReference';
import { OfflineBanner } from '@/src/components/OfflineBanner';

export default function CardReferenceScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 4,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }}>
            NMJL Card
          </Text>
          <Text style={{ color: theme.textSubtle, fontSize: 13, marginTop: 1 }}>
            2025 hand patterns · tap a category to filter
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <OfflineBanner />
      </View>

      <CardReference year={2025} />
    </SafeAreaView>
  );
}

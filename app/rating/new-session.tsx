import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useUser } from '@/src/state/userStore';
import { Card } from '@/src/components/Card';
import PrimaryButton from '@/src/components/PrimaryButton';
import { computeNGS } from '@/src/rating';

type SeatForm = { name: string; total: string };

export default function NewSessionScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { profile } = useUser();
  const createSession = useMutation(api.srs.createRatingSession);

  const [seats, setSeats] = useState<SeatForm[]>([
    { name: profile.displayName || 'You', total: '' },
    { name: '', total: '' },
    { name: '', total: '' },
    { name: '', total: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = seats.filter((s, i) => i === 0 || s.name.trim().length > 0);
  const totals = active.map((s) => Number(s.total) || 0);
  const previewNgs = computeNGS(totals);

  const setSeat = (i: number, patch: Partial<SeatForm>) =>
    setSeats((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const handleSubmit = async () => {
    setError(null);
    const filled = seats.filter((s, i) => i === 0 || s.name.trim().length > 0);
    if (filled.length < 2) {
      setError('Enter at least two players.');
      return;
    }
    if (filled.some((s) => s.total.trim() === '' || Number.isNaN(Number(s.total)))) {
      setError('Every seated player needs a numeric point total.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createSession({
        seats: filled.map((s, i) => ({
          name: i === 0 ? s.name.trim() || 'You' : s.name.trim(),
          enteredTotal: Number(s.total),
        })),
      });
      router.replace(`/rating/${res.sessionId}` as any);
    } catch (e: any) {
      setError(e?.message ?? 'Could not create the session.');
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient colors={theme.gradientHero} style={{ paddingBottom: 24 }}>
        <SafeAreaView edges={['top']}>
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginBottom: 12 }}>
              <Ionicons name="chevron-back" size={26} color="#FFF" />
            </Pressable>
            <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.4 }}>
              Enter final totals
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13, marginTop: 6, lineHeight: 19 }}>
              Use Laura's tournament points from the session. You're seat 1 — add the others, then
              two players confirm to lock it in.
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        {seats.map((s, i) => (
          <Card key={i} variant="elevated" style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: theme.primary + '22',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: theme.primaryText, fontWeight: '800', fontSize: 13 }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 2 }}>
                <Text style={labelStyle(theme)}>{i === 0 ? 'YOU' : `PLAYER ${i + 1}`}</Text>
                <TextInput
                  value={s.name}
                  onChangeText={(v) => setSeat(i, { name: v })}
                  editable={i !== 0}
                  placeholder={i === 0 ? profile.displayName || 'You' : 'Name (optional)'}
                  placeholderTextColor={theme.textSubtle}
                  style={inputStyle(theme)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={labelStyle(theme)}>POINTS</Text>
                <TextInput
                  value={s.total}
                  onChangeText={(v) => setSeat(i, { total: v.replace(/[^0-9-]/g, '') })}
                  placeholder="0"
                  placeholderTextColor={theme.textSubtle}
                  keyboardType="numbers-and-punctuation"
                  style={[inputStyle(theme), { textAlign: 'center', fontWeight: '800' }]}
                />
              </View>
            </View>
            {i === 0 || s.name.trim().length > 0 ? (
              <Text style={{ color: theme.textSubtle, fontSize: 11, marginTop: 8 }}>
                Normalized score (NGS): {(previewNgs[active.indexOf(s)] ?? 0.5).toFixed(2)}
              </Text>
            ) : null}
          </Card>
        ))}

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
              marginBottom: 12,
            }}
          >
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        <PrimaryButton
          label={submitting ? 'Creating…' : 'Create session'}
          size="lg"
          loading={submitting}
          disabled={submitting}
          onPress={handleSubmit}
        />
      </ScrollView>
    </View>
  );
}

function labelStyle(theme: ReturnType<typeof useTheme>['theme']) {
  return {
    color: theme.textSubtle,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  };
}

function inputStyle(theme: ReturnType<typeof useTheme>['theme']) {
  return {
    backgroundColor: theme.bg,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  };
}

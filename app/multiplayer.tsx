import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useTheme } from '../src/theme/ThemeProvider';
import { Card } from '../src/components/Card';
import { Badge } from '../src/components/Badge';
import PrimaryButton from '../src/components/PrimaryButton';
import { useSession } from '../lib/auth-client';

export default function MultiplayerScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthed = !!session;

  const tables = useQuery(api.multiplayer.listOpenTables, isAuthed ? {} : 'skip');
  const myRoom = useQuery(api.multiplayer.myActiveRoom, isAuthed ? {} : 'skip');
  const matchStatus = useQuery(api.multiplayer.myMatchmakingStatus, isAuthed ? {} : 'skip');
  const skillMatch = useQuery(api.multiplayer.findSkillMatchedRoom, isAuthed ? {} : 'skip');

  const createRoom = useMutation(api.multiplayer.createRoom);
  const joinRoom = useMutation(api.multiplayer.joinRoom);
  const enterMM = useMutation(api.multiplayer.enterMatchmaking);
  const leaveMM = useMutation(api.multiplayer.leaveMatchmaking);
  const quickplay = useMutation(api.multiplayer.quickplaySkillMatch);
  const joinSpectator = useMutation(api.social.joinAsSpectator);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const queued = !!matchStatus && !matchStatus.matchedRoomId;
  const matched = matchStatus?.matchedRoomId;

  // Auto-route into matched room
  React.useEffect(() => {
    if (matched) {
      router.push(`/room/${matched}` as any);
    }
  }, [matched, router]);

  const handleQuickMatch = async () => {
    if (!isAuthed) return router.push('/auth/sign-in' as any);
    setBusy('quick');
    try {
      if (queued) await leaveMM({});
      else await enterMM({ mode: 'ranked' });
    } catch (e: any) {
      Alert.alert('Matchmaking', e?.message ?? 'Failed');
    }
    setBusy(null);
  };

  const handleSkillMatch = async () => {
    if (!isAuthed) return router.push('/auth/sign-in' as any);
    setBusy('skill');
    try {
      const res = await quickplay({});
      router.push(`/room/${res.roomId}` as any);
    } catch (e: any) {
      Alert.alert('Skill match', e?.message ?? 'Failed');
      setBusy(null);
    }
  };

  const handleHost = async (mode: 'private' | 'casual') => {
    if (!isAuthed) return router.push('/auth/sign-in' as any);
    setBusy('host');
    try {
      const res = await createRoom({ mode, fillWithAI: false });
      router.push(`/room/${res.roomId}` as any);
    } catch (e: any) {
      Alert.alert('Host', e?.message ?? 'Failed');
    }
    setBusy(null);
  };

  const handleJoinCode = async () => {
    if (!isAuthed) return router.push('/auth/sign-in' as any);
    if (code.trim().length < 4) return;
    setBusy('join');
    try {
      const res = await joinRoom({ code: code.trim().toUpperCase() });
      router.push(`/room/${res.roomId}` as any);
    } catch (e: any) {
      Alert.alert('Join', e?.message ?? 'Could not join room');
    }
    setBusy(null);
  };

  const handleJoinTable = async (joinCode: string) => {
    setBusy(joinCode);
    try {
      const res = await joinRoom({ code: joinCode });
      router.push(`/room/${res.roomId}` as any);
    } catch (e: any) {
      Alert.alert('Join', e?.message ?? 'Failed');
    }
    setBusy(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color={theme.text} />
            <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>Back</Text>
          </Pressable>

          <Text style={{ color: theme.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>
            Multiplayer
          </Text>
          <Text style={{ color: theme.textSubtle, fontSize: 14, marginTop: 4 }}>
            Find a table or host your own.
          </Text>
        </View>

        {!isAuthed && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Card variant="elevated" padding={16}>
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }}>
                Sign in to play live
              </Text>
              <Text style={{ color: theme.textSubtle, fontSize: 13, marginTop: 4 }}>
                Multiplayer needs an account to track ELO and reconnects.
              </Text>
              <View style={{ marginTop: 12 }}>
                <PrimaryButton label="Sign in" onPress={() => router.push('/auth/sign-in' as any)} />
              </View>
            </Card>
          </View>
        )}

        {isAuthed && myRoom && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Card variant="elevated" padding={14}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="time" size={18} color={theme.gold} />
                <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>
                  Resume table {myRoom.code}
                </Text>
              </View>
              <Text style={{ color: theme.textSubtle, fontSize: 12, marginTop: 4 }}>
                You're already seated in a {myRoom.mode} room.
              </Text>
              <View style={{ marginTop: 10 }}>
                <PrimaryButton
                  label="Rejoin table"
                  size="md"
                  onPress={() => router.push(`/room/${myRoom._id}` as any)}
                />
              </View>
            </Card>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          <LinearGradient
            colors={theme.gradientHero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 18, padding: 18, borderWidth: 1, borderColor: theme.gold }}
          >
            <Badge label={queued ? 'Searching…' : 'Ranked'} tone="gold" />
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800', marginTop: 10, letterSpacing: -0.3 }}>
              {queued ? 'Finding opponents…' : 'Quick Match'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 13, marginTop: 4 }}>
              {queued
                ? `Waiting ${Math.round((matchStatus?.waitingMs ?? 0) / 1000)}s · matched within ±${200} rating (wider while provisional)`
                : 'Match against players near your Sparrow Rating. Auto-routes when 4 are ready.'}
            </Text>
            <View style={{ marginTop: 14 }}>
              <PrimaryButton
                label={queued ? 'Cancel search' : 'Find a table'}
                size="md"
                onPress={handleQuickMatch}
                disabled={busy === 'quick'}
              />
            </View>
          </LinearGradient>

          {isAuthed && (
            <Pressable onPress={handleSkillMatch} disabled={busy === 'skill'}>
              <Card variant="elevated" padding={14} style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: theme.gold + '22',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="flash" size={20} color={theme.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }}>
                        {busy === 'skill' ? 'Finding a table…' : 'Skill match — play now'}
                      </Text>
                      {skillMatch?.myTier ? <Badge label={skillMatch.myTier} tone="gold" /> : null}
                    </View>
                    <Text style={{ color: theme.textSubtle, fontSize: 12, marginTop: 2 }}>
                      {skillMatch
                        ? `Open table near your level (avg ${skillMatch.srsAvg}${
                            skillMatch.tiers.length ? ` · ${skillMatch.tiers.join(', ')}` : ''
                          })`
                        : 'Drops you into the closest open table by Sparrow Rating, or seeds a new one.'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
                </View>
              </Card>
            </Pressable>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.border }}>
              <Ionicons name="key" size={18} color={theme.gold} />
              <Text style={{ color: theme.text, fontWeight: '800', marginTop: 8 }}>Join with code</Text>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                placeholder="ABC123"
                placeholderTextColor={theme.textSubtle}
                autoCapitalize="characters"
                maxLength={6}
                style={{
                  marginTop: 8,
                  backgroundColor: theme.bg,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  color: theme.text,
                  fontSize: 14,
                  fontWeight: '700',
                  letterSpacing: 2,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              />
              <Pressable
                onPress={handleJoinCode}
                disabled={busy === 'join' || code.length < 4}
                style={{
                  marginTop: 8,
                  backgroundColor: code.length >= 4 ? theme.primary : theme.border,
                  borderRadius: 8,
                  paddingVertical: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>
                  {busy === 'join' ? 'Joining…' : 'Join'}
                </Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => handleHost('private')}
              disabled={busy === 'host'}
              style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.border }}
            >
              <Ionicons name="add-circle" size={18} color={theme.primary} />
              <Text style={{ color: theme.text, fontWeight: '800', marginTop: 8 }}>Host private</Text>
              <Text style={{ color: theme.textSubtle, fontSize: 12, marginTop: 2 }}>
                Generates an invite code
              </Text>
              <View
                style={{
                  marginTop: 8,
                  backgroundColor: theme.primary,
                  borderRadius: 8,
                  paddingVertical: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>
                  {busy === 'host' ? 'Creating…' : 'Create room'}
                </Text>
              </View>
            </Pressable>
          </View>

          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', marginTop: 22, marginBottom: 10 }}>
            Open tables
          </Text>

          {tables === undefined && isAuthed && (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={theme.gold} />
            </View>
          )}

          {tables && tables.length === 0 && (
            <Card variant="elevated" padding={18}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>No open tables right now</Text>
              <Text style={{ color: theme.textSubtle, fontSize: 13, marginTop: 4 }}>
                Host one — friends can join with the invite code.
              </Text>
            </Card>
          )}

          {tables?.map((t) => (
            <Card key={t._id as string} variant="elevated" padding={14} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="people" size={18} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>{t.host}</Text>
                    <Badge label={t.mode === 'ranked' ? 'Ranked' : 'Casual'} tone={t.mode === 'ranked' ? 'gold' : 'jade'} />
                    {t.tiers?.map((tier) => (
                      <Badge key={tier} label={tier} tone="neutral" />
                    ))}
                  </View>
                  <Text style={{ color: theme.textSubtle, fontSize: 12, marginTop: 2 }}>
                    {t.filled}/4 seats · {t.srsAvg ? `Rating ${t.srsAvg}` : `ELO ${t.eloAvg}`} · #{t.code}
                  </Text>
                </View>
                {t.filled >= 4 && (
                  <Pressable
                    onPress={async () => {
                      try {
                        await joinSpectator({ roomId: t._id });
                        router.push(`/room/${t._id}` as any);
                      } catch (e: any) {
                        Alert.alert('Watch', e?.message ?? 'Failed');
                      }
                    }}
                    style={{
                      backgroundColor: theme.surfaceAlt,
                      borderWidth: 1,
                      borderColor: theme.border,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      marginRight: 6,
                    }}
                  >
                    <Text style={{ color: theme.text, fontWeight: '800', fontSize: 12 }}>Watch</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => handleJoinTable(t.code)}
                  disabled={busy === t.code || t.filled >= 4}
                  style={{
                    backgroundColor: t.filled >= 4 ? theme.border : theme.primary,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>
                    {t.filled >= 4 ? 'Full' : busy === t.code ? '…' : 'Join'}
                  </Text>
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

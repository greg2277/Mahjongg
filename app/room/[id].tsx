import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import PrimaryButton from '../../src/components/PrimaryButton';
import { useSession } from '../../lib/auth-client';

export default function RoomScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const roomId = id as Id<'rooms'>;
  const { data: session } = useSession();
  const isAuthed = !!session;

  const data = useQuery(api.multiplayer.getRoom, isAuthed && id ? { roomId } : 'skip');
  const fillAI = useMutation(api.multiplayer.fillSeatsWithAI);
  const startGame = useMutation(api.multiplayer.startGame);
  const leaveRoom = useMutation(api.multiplayer.leaveRoom);
  const submitMove = useMutation(api.multiplayer.submitMove);
  const sendChat = useMutation(api.multiplayer.sendChat);
  const setReady = useMutation(api.multiplayer.setReady);
  const tickTurn = useMutation(api.multiplayer.tickTurn);
  const finishGame = useMutation(api.multiplayer.finishGame);
  const ackMatched = useMutation(api.multiplayer.ackMatched);
  const sendReaction = useMutation(api.social.sendReaction);
  const spectators = useQuery(api.social.listSpectators, id ? { roomId } : 'skip');

  const [busy, setBusy] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [chatText, setChatText] = useState('');
  const lastTickRef = useRef(0);

  // Re-render every second for the turn timer
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const room = data?.room;
  const moves = data?.recentMoves ?? [];
  const userId = (session?.user as any)?.id as string | undefined;
  const mySeatIdx = useMemo(
    () => room?.seats.findIndex((s) => s.userId === userId) ?? -1,
    [room, userId]
  );
  const isHost = !!userId && room?.hostUserId === userId;
  const filled = room?.seats.every((s) => s.userId || s.isAI) ?? false;
  const allReady = room?.seats.every((s) => s.ready) ?? false;
  const meReady = mySeatIdx >= 0 ? room?.seats[mySeatIdx]?.ready : false;

  const turnRemaining = useMemo(() => {
    if (!room?.turnDeadline) return 0;
    return Math.max(0, Math.ceil((room.turnDeadline - Date.now()) / 1000));
  }, [room?.turnDeadline, tick]);

  // Auto-tick turn when timer expires (anyone in room can trigger it)
  useEffect(() => {
    if (!room || room.status !== 'in_progress' || !room.turnDeadline) return;
    if (room.turnDeadline > Date.now()) return;
    if (Date.now() - lastTickRef.current < 2000) return;
    lastTickRef.current = Date.now();
    void tickTurn({ roomId }).catch(() => {});
  }, [room, tick, roomId, tickTurn]);

  // Ack match queue once we land in a matched room
  useEffect(() => {
    if (room && mySeatIdx >= 0) {
      void ackMatched({}).catch(() => {});
    }
  }, [room?._id, mySeatIdx, ackMatched]);

  if (!isAuthed) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Sign in required</Text>
          <View style={{ marginTop: 12 }}>
            <PrimaryButton label="Sign in" onPress={() => router.push('/auth/sign-in' as any)} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (data === undefined) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.gold} />
        </View>
      </SafeAreaView>
    );
  }

  if (!room) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="alert-circle" size={36} color={theme.textSubtle} />
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16, marginTop: 8 }}>
            Room not found
          </Text>
          <View style={{ marginTop: 12 }}>
            <PrimaryButton label="Back to lobby" onPress={() => router.replace('/multiplayer' as any)} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({ message: `Join my Jade Pavilion table — code ${room.code}` });
    } catch {}
  };

  const handleStart = async () => {
    setBusy('start');
    try {
      await startGame({ roomId });
    } catch (e: any) {
      Alert.alert('Start', e?.message ?? 'Failed');
    }
    setBusy(null);
  };

  const handleFill = async () => {
    setBusy('fill');
    try {
      await fillAI({ roomId });
    } catch (e: any) {
      Alert.alert('Fill', e?.message ?? 'Failed');
    }
    setBusy(null);
  };

  const handleLeave = async () => {
    setBusy('leave');
    try {
      await leaveRoom({ roomId });
      router.replace('/multiplayer' as any);
    } catch (e: any) {
      Alert.alert('Leave', e?.message ?? 'Failed');
      setBusy(null);
    }
  };

  const handleDiscard = async () => {
    if (mySeatIdx === -1 || room.turnSeat !== mySeatIdx) return;
    setBusy('move');
    try {
      await submitMove({
        roomId,
        type: 'discard',
        payload: JSON.stringify({ tile: 'auto', at: Date.now() }),
      });
    } catch (e: any) {
      Alert.alert('Move', e?.message ?? 'Failed');
    }
    setBusy(null);
  };

  const handleReadyToggle = async () => {
    if (mySeatIdx === -1) return;
    try {
      await setReady({ roomId, ready: !meReady });
    } catch (e: any) {
      Alert.alert('Ready', e?.message ?? 'Failed');
    }
  };

  const handleSendChat = async () => {
    const t = chatText.trim();
    if (!t) return;
    setChatText('');
    try {
      await sendChat({ roomId, text: t });
    } catch {}
  };

  const handleDeclareMahjong = async () => {
    if (mySeatIdx === -1) return;
    setBusy('finish');
    try {
      await finishGame({ roomId, winnerSeat: mySeatIdx, points: 35 });
    } catch (e: any) {
      Alert.alert('Mahjong', e?.message ?? 'Failed');
    }
    setBusy(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <LinearGradient
            colors={theme.gradientHero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}
          >
            <Pressable
              onPress={() => router.back()}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={20} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Back</Text>
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Badge
                label={room.mode === 'ranked' ? 'Ranked' : room.mode === 'casual' ? 'Casual' : 'Private'}
                tone="gold"
              />
              <Badge
                label={
                  room.status === 'in_progress'
                    ? 'Live'
                    : room.status === 'finished'
                    ? 'Finished'
                    : room.status === 'abandoned'
                    ? 'Closed'
                    : 'Lobby'
                }
                tone="jade"
              />
            </View>

            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800', marginTop: 10, letterSpacing: -0.5 }}>
              Table {room.code}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 }}>
              Hosted by {room.hostName} · ELO {room.eloAvg}
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable
                onPress={handleShare}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                }}
              >
                <Ionicons name="share-outline" size={14} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Share invite</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/replay/${roomId}` as any)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                }}
              >
                <Ionicons name="film-outline" size={14} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Replay</Text>
              </Pressable>
              <Pressable
                onPress={handleLeave}
                disabled={busy === 'leave'}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'rgba(0,0,0,0.25)',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                }}
              >
                <Ionicons name="exit-outline" size={14} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>
                  {isHost && room.status === 'waiting' ? 'Close room' : 'Leave'}
                </Text>
              </Pressable>
            </View>
          </LinearGradient>

          <View style={{ paddingHorizontal: 16, marginTop: -10 }}>
            <Card variant="elevated" padding={14}>
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14, marginBottom: 10 }}>
                Seats
              </Text>
              {room.seats.map((seat, i) => {
                const isTurn = room.status === 'in_progress' && room.turnSeat === i;
                const isMe = seat.userId && seat.userId === userId;
                return (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 8,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: theme.border,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: isTurn
                          ? theme.gold
                          : seat.isAI
                          ? theme.textSubtle
                          : theme.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{seat.wind}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>
                        {seat.name}
                        {isMe ? ' (you)' : ''}
                      </Text>
                      <Text style={{ color: theme.textSubtle, fontSize: 11 }}>
                        {seat.userId || seat.isAI ? `ELO ${seat.elo}` : 'Waiting…'}
                        {seat.isAI ? ' · AI' : ''}
                      </Text>
                    </View>
                    {isTurn && (
                      <View
                        style={{
                          backgroundColor: theme.gold,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: '#1a1a1a', fontSize: 10, fontWeight: '800' }}>
                          TURN · {turnRemaining}s
                        </Text>
                      </View>
                    )}
                    {!isTurn && seat.ready && (seat.userId || seat.isAI) && (
                      <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
                    )}
                    {!isTurn && !seat.ready && (seat.userId || seat.isAI) && (
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          backgroundColor: theme.border,
                        }}
                      >
                        <Text style={{ color: theme.textSubtle, fontSize: 10, fontWeight: '700' }}>
                          NOT READY
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </Card>

            {room.status === 'waiting' && (
              <View style={{ marginTop: 12, gap: 10 }}>
                {mySeatIdx >= 0 && (
                  <PrimaryButton
                    label={meReady ? 'Cancel ready' : 'I\u2019m ready'}
                    variant={meReady ? 'outline' : 'primary'}
                    onPress={handleReadyToggle}
                  />
                )}
                {isHost && !filled && (
                  <PrimaryButton
                    label="Fill empty seats with AI"
                    variant="outline"
                    onPress={handleFill}
                    disabled={busy === 'fill'}
                  />
                )}
                {isHost && (
                  <PrimaryButton
                    label={!filled ? 'Waiting for players…' : !allReady ? 'Waiting for ready…' : 'Start game'}
                    onPress={handleStart}
                    disabled={!filled || !allReady || busy === 'start'}
                  />
                )}
                {!isHost && (
                  <Card variant="default" padding={14}>
                    <Text style={{ color: theme.textSubtle, fontSize: 13 }}>
                      Waiting for host to start. Share code{' '}
                      <Text style={{ color: theme.text, fontWeight: '800' }}>{room.code}</Text>.
                    </Text>
                  </Card>
                )}
              </View>
            )}

            {room.status === 'in_progress' && (
              <View style={{ marginTop: 12, gap: 10 }}>
                <Card variant="elevated" padding={14}>
                  <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>Game in progress</Text>
                  <Text style={{ color: theme.textSubtle, fontSize: 12, marginTop: 4 }}>
                    Turn: {room.seats[room.turnSeat ?? 0]?.name} · {turnRemaining}s remaining
                  </Text>
                  {mySeatIdx >= 0 && room.turnSeat === mySeatIdx && (
                    <View style={{ marginTop: 12, gap: 8 }}>
                      <PrimaryButton
                        label="Discard tile"
                        onPress={handleDiscard}
                        disabled={busy === 'move'}
                      />
                      <PrimaryButton
                        label="Declare Mahjong"
                        variant="outline"
                        onPress={handleDeclareMahjong}
                        disabled={busy === 'finish'}
                      />
                    </View>
                  )}
                </Card>
              </View>
            )}

            {room.status === 'finished' && (
              <View style={{ marginTop: 12 }}>
                <Card variant="elevated" padding={14}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="trophy" size={20} color={theme.gold} />
                    <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }}>Game finished</Text>
                  </View>
                  <Text style={{ color: theme.textSubtle, fontSize: 12, marginTop: 6 }}>
                    Stats and ELO have been updated. Return to the lobby to find another match.
                  </Text>
                  <View style={{ marginTop: 12 }}>
                    <PrimaryButton label="Back to lobby" onPress={() => router.replace('/multiplayer' as any)} />
                  </View>
                </Card>
              </View>
            )}

            {/* Activity / chat feed */}
            <View style={{ marginTop: 14 }}>
              <Card variant="default" padding={14}>
                <Text style={{ color: theme.text, fontWeight: '800', fontSize: 13, marginBottom: 8 }}>
                  Table chat & activity
                </Text>
                {moves.length === 0 ? (
                  <Text style={{ color: theme.textSubtle, fontSize: 12 }}>
                    No activity yet. Say hi to your table!
                  </Text>
                ) : (
                  moves.slice(-12).map((m) => {
                    let payload: any = {};
                    try {
                      payload = JSON.parse(m.payload);
                    } catch {}
                    const seatName = room.seats[m.seat]?.name ?? `Seat ${m.seat}`;
                    if (m.type === 'reaction') {
                      return (
                        <View key={m._id as string} style={{ flexDirection: 'row', gap: 8, paddingVertical: 3 }}>
                          <Text style={{ color: theme.textSubtle, fontSize: 11, width: 32 }}>#{m.seq}</Text>
                          <Text style={{ color: theme.text, fontSize: 12, flex: 1 }}>
                            {seatName} reacted {payload.emoji ?? ''}
                          </Text>
                        </View>
                      );
                    }
                    if (m.type === 'spectator_join') {
                      return (
                        <View key={m._id as string} style={{ flexDirection: 'row', gap: 8, paddingVertical: 3 }}>
                          <Text style={{ color: theme.textSubtle, fontSize: 11, width: 32 }}>#{m.seq}</Text>
                          <Text style={{ color: theme.textSubtle, fontSize: 11, flex: 1, fontStyle: 'italic' }}>
                            {payload.name ?? 'A spectator'} joined to watch
                          </Text>
                        </View>
                      );
                    }
                    if (m.type === 'chat') {
                      return (
                        <View
                          key={m._id as string}
                          style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}
                        >
                          <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '700' }}>
                            {seatName}:
                          </Text>
                          <Text style={{ color: theme.text, fontSize: 12, flex: 1 }}>
                            {payload.text ?? ''}
                          </Text>
                        </View>
                      );
                    }
                    const label =
                      m.type === 'game_start'
                        ? 'Game started'
                        : m.type === 'mahjong'
                        ? `${seatName} declared Mahjong! (+${payload.points ?? 0})`
                        : m.type === 'timeout'
                        ? `${seatName} timed out`
                        : `${seatName} · ${m.type}`;
                    return (
                      <View
                        key={m._id as string}
                        style={{ flexDirection: 'row', gap: 8, paddingVertical: 3 }}
                      >
                        <Text style={{ color: theme.textSubtle, fontSize: 11, width: 32 }}>
                          #{m.seq}
                        </Text>
                        <Text
                          style={{ color: theme.textSubtle, fontSize: 11, flex: 1, fontStyle: 'italic' }}
                        >
                          {label}
                        </Text>
                      </View>
                    );
                  })
                )}

                {/* Emoji reactions row */}
                {room.status !== 'abandoned' && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {['👍', '👏', '🔥', '🎉', '🀄', '😅', '😱', '🧧'].map((e) => (
                      <Pressable
                        key={e}
                        onPress={() => { void sendReaction({ roomId, emoji: e }).catch(() => {}); }}
                        style={{
                          backgroundColor: theme.surfaceAlt,
                          borderWidth: 1,
                          borderColor: theme.border,
                          borderRadius: 18,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Text style={{ fontSize: 16 }}>{e}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Spectators */}
                {spectators && spectators.length > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    <Ionicons name="eye" size={12} color={theme.textSubtle} />
                    <Text style={{ color: theme.textSubtle, fontSize: 11, fontWeight: '700' }}>
                      Watching ({spectators.length}):
                    </Text>
                    {spectators.slice(0, 5).map((s) => (
                      <Text key={s.userId} style={{ color: theme.textSubtle, fontSize: 11 }}>
                        {s.name}
                      </Text>
                    ))}
                  </View>
                )}

                {mySeatIdx >= 0 && room.status !== 'finished' && room.status !== 'abandoned' && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TextInput
                      value={chatText}
                      onChangeText={setChatText}
                      placeholder="Send a quick message…"
                      placeholderTextColor={theme.textSubtle}
                      maxLength={200}
                      style={{
                        flex: 1,
                        backgroundColor: theme.bg,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        color: theme.text,
                        fontSize: 13,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      onSubmitEditing={handleSendChat}
                    />
                    <Pressable
                      onPress={handleSendChat}
                      style={{
                        backgroundColor: theme.primary,
                        paddingHorizontal: 14,
                        borderRadius: 10,
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="send" size={16} color="#FFF" />
                    </Pressable>
                  </View>
                )}
              </Card>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

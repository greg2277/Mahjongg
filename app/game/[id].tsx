import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Card } from '@/src/components/Card';
import { Badge } from '@/src/components/Badge';
import PrimaryButton from '@/src/components/PrimaryButton';
import { Tile } from '@/src/components/Tile';
import { TileSortControls } from '@/src/components/TileSortControls';
import { sortTiles, type SortMode } from '@/src/games/nmjl/sort';
import { useUser } from '@/src/state/userStore';
import { useStatsSync } from '@/src/hooks/useStatsSync';
import {
  GAMES,
  type GameId,
  MATCH_ROUNDS,
  READER_ROUNDS,
  CHARLESTON_ROUNDS,
  HAND_PICKER_ROUNDS,
  DISCARD_ROUNDS,
  JOKER_SWAP_ROUNDS,
} from '@/src/games/data';

type Feedback = { correct: boolean; reason?: string } | null;

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const { addXP, recordResult } = useUser();
  const { recordGame } = useStatsSync();

  const gameId = String(id ?? 'tile-match') as GameId;
  const meta = GAMES[gameId] ?? GAMES['tile-match'];

  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  const total = meta.rounds;
  const progress = ((round + (feedback ? 1 : 0)) / total) * 100;

  const reset = () => {
    setRound(0);
    setScore(0);
    setFeedback(null);
    setSelected([]);
    setDone(false);
  };

  const next = () => {
    if (round + 1 >= total) {
      setDone(true);
      addXP(score);
      recordResult(score >= total * meta.xpPerCorrect * 0.6);
    } else {
      setRound((r) => r + 1);
      setFeedback(null);
      setSelected([]);
    }
  };

  const award = (correct: boolean, reason?: string) => {
    if (correct) setScore((s) => s + meta.xpPerCorrect);
    setFeedback({ correct, reason });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <LinearGradient
          colors={meta.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Back</Text>
          </Pressable>

          <Badge label={meta.tag} tone="gold" />
          <Text
            style={{
              color: '#FFF',
              fontSize: 24,
              fontWeight: '800',
              marginTop: 10,
              letterSpacing: -0.5,
            }}
          >
            {meta.title}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 6, lineHeight: 19 }}>
            {meta.description}
          </Text>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Stat label="ROUND" value={`${Math.min(round + 1, total)} / ${total}`} />
            <Stat label="SCORE" value={`${score} XP`} />
          </View>

          <View
            style={{
              marginTop: 14,
              height: 4,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${progress}%`,
                backgroundColor: '#FFF',
                borderRadius: 2,
              }}
            />
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, marginTop: -14 }}>
          {done ? (
            <ResultCard score={score} total={total * meta.xpPerCorrect} onReplay={reset} onExit={() => router.back()} />
          ) : (
            <GameBody
              gameId={gameId}
              round={round}
              feedback={feedback}
              selected={selected}
              setSelected={setSelected}
              award={award}
              next={next}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        padding: 12,
      }}
    >
      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700' }}>
        {label}
      </Text>
      <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

function ResultCard({
  score,
  total,
  onReplay,
  onExit,
}: {
  score: number;
  total: number;
  onReplay: () => void;
  onExit: () => void;
}) {
  const { theme } = useTheme();
  const pct = Math.round((score / Math.max(1, total)) * 100);
  return (
    <Card variant="elevated" padding={20}>
      <View style={{ alignItems: 'center', paddingVertical: 12 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: theme.gold + '22',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <Ionicons name="trophy" size={36} color={theme.gold} />
        </View>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 }}>
          {pct >= 80 ? 'Brilliant!' : pct >= 50 ? 'Nice work!' : 'Keep training'}
        </Text>
        <Text style={{ color: theme.textSubtle, fontSize: 14, marginTop: 6 }}>
          {score} XP earned · {pct}% accuracy
        </Text>
        <View style={{ width: '100%', marginTop: 20, gap: 10 }}>
          <PrimaryButton label="Play again" size="lg" onPress={onReplay} />
          <Pressable
            onPress={onExit}
            style={{
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>Back to Play</Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

// ─────────── PER-GAME BODIES ───────────

type BodyProps = {
  gameId: GameId;
  round: number;
  feedback: Feedback;
  selected: number[];
  setSelected: (s: number[]) => void;
  award: (correct: boolean, reason?: string) => void;
  next: () => void;
};

function GameBody(props: BodyProps) {
  switch (props.gameId) {
    case 'tile-match':
      return <MatchBody {...props} />;
    case 'card-reader':
      return <ReaderBody {...props} />;
    case 'charleston':
      return <CharlestonBody {...props} />;
    case 'hand-picker':
      return <HandPickerBody {...props} />;
    case 'discard':
      return <DiscardBody {...props} />;
    case 'joker-swap':
      return <JokerSwapBody {...props} />;
    default:
      return <MatchBody {...props} />;
  }
}

function FeedbackBlock({
  feedback,
  next,
}: {
  feedback: Feedback;
  next: () => void;
}) {
  const { theme } = useTheme();
  if (!feedback) return null;
  return (
    <View style={{ marginTop: 14 }}>
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          padding: 12,
          borderRadius: 10,
          backgroundColor: feedback.correct ? '#10B98118' : '#DC262618',
          borderLeftWidth: 3,
          borderLeftColor: feedback.correct ? '#10B981' : '#DC2626',
        }}
      >
        <Ionicons
          name={feedback.correct ? 'checkmark-circle' : 'close-circle'}
          size={18}
          color={feedback.correct ? '#10B981' : '#DC2626'}
          style={{ marginTop: 1 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800' }}>
            {feedback.correct ? 'Correct' : 'Not quite'}
          </Text>
          {feedback.reason ? (
            <Text style={{ color: theme.textSubtle, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
              {feedback.reason}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ marginTop: 14 }}>
        <PrimaryButton label="Continue" size="lg" onPress={next} />
      </View>
    </View>
  );
}

// Tile & Joker Match
function MatchBody({ round, feedback, award, next }: BodyProps) {
  const { theme } = useTheme();
  const r = MATCH_ROUNDS[round % MATCH_ROUNDS.length];
  return (
    <Card variant="elevated" padding={18}>
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', lineHeight: 22 }}>
        {r.prompt}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
        {r.pile.map((t, i) => (
          <Pressable
            key={i}
            disabled={!!feedback}
            onPress={() => award(i === r.correctIndex)}
          >
            <Tile suit={t.suit} value={t.value} size="md" />
          </Pressable>
        ))}
      </View>
      <FeedbackBlock feedback={feedback} next={next} />
    </Card>
  );
}

// Card Reader
function ReaderBody({ round, feedback, award, next }: BodyProps) {
  const { theme } = useTheme();
  const r = READER_ROUNDS[round % READER_ROUNDS.length];
  const [sortMode, setSortMode] = useState<SortMode>('suit');
  const tiles = useMemo(() => sortTiles(r.tiles, sortMode), [r.tiles, sortMode]);
  return (
    <Card variant="elevated" padding={18}>
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>{r.prompt}</Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 6,
          marginTop: 14,
          padding: 10,
          backgroundColor: theme.bg,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: theme.border,
          justifyContent: 'center',
        }}
      >
        {tiles.map((t, i) => (
          <Tile key={i} suit={t.suit} value={t.value} size="sm" />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
        <TileSortControls mode={sortMode} onChange={setSortMode} compact />
      </View>
      <View style={{ marginTop: 14, gap: 8 }}>
        {r.options.map((opt, i) => (
          <Pressable
            key={i}
            disabled={!!feedback}
            onPress={() => award(i === r.correctIndex)}
            style={{
              padding: 14,
              borderRadius: 10,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor:
                feedback && i === r.correctIndex
                  ? '#10B981'
                  : theme.border,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>{opt}</Text>
          </Pressable>
        ))}
      </View>
      <FeedbackBlock feedback={feedback} next={next} />
    </Card>
  );
}

// Charleston Trainer
function CharlestonBody({ round, feedback, selected, setSelected, award, next }: BodyProps) {
  const { theme } = useTheme();
  const r = CHARLESTON_ROUNDS[round % CHARLESTON_ROUNDS.length];

  const toggle = (i: number) => {
    if (feedback) return;
    if (selected.includes(i)) setSelected(selected.filter((x) => x !== i));
    else if (selected.length < 3) setSelected([...selected, i]);
  };

  const submit = () => {
    if (selected.length !== 3) return;
    const correct = selected.every((i) => r.correctIndexes.includes(i));
    award(
      correct,
      correct
        ? 'Solid pass — these tiles do not fit your target hand.'
        : `Best pass: tiles ${r.correctIndexes.map((x) => x + 1).join(', ')} — they do not fit the target.`,
    );
  };

  return (
    <Card variant="elevated" padding={18}>
      <Text style={{ color: theme.textSubtle, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
        TARGET HAND
      </Text>
      <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700', marginTop: 4, lineHeight: 21 }}>
        {r.targetHand}
      </Text>
      <Text style={{ color: theme.textSubtle, fontSize: 13, marginTop: 10 }}>
        Pick the 3 tiles to pass ({selected.length}/3 selected)
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 6,
          marginTop: 12,
          justifyContent: 'center',
        }}
      >
        {r.hand.map((t, i) => (
          <Pressable key={i} onPress={() => toggle(i)}>
            <Tile suit={t.suit} value={t.value} size="sm" selected={selected.includes(i)} />
          </Pressable>
        ))}
      </View>
      {!feedback ? (
        <View style={{ marginTop: 16 }}>
          <PrimaryButton label="Submit pass" size="lg" onPress={submit} disabled={selected.length !== 3} />
        </View>
      ) : null}
      <FeedbackBlock feedback={feedback} next={next} />
    </Card>
  );
}

// Hand Picker
function HandPickerBody({ round, feedback, award, next }: BodyProps) {
  const { theme } = useTheme();
  const r = HAND_PICKER_ROUNDS[round % HAND_PICKER_ROUNDS.length];
  const [sortMode, setSortMode] = useState<SortMode>('suit');
  const tiles = useMemo(() => sortTiles(r.hand, sortMode), [r.hand, sortMode]);
  return (
    <Card variant="elevated" padding={18}>
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>
        Which hand should you pursue?
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 6,
          marginTop: 14,
          padding: 10,
          backgroundColor: theme.bg,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: theme.border,
          justifyContent: 'center',
        }}
      >
        {tiles.map((t, i) => (
          <Tile key={i} suit={t.suit} value={t.value} size="sm" />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
        <TileSortControls mode={sortMode} onChange={setSortMode} compact />
      </View>
      <View style={{ marginTop: 14, gap: 8 }}>
        {r.options.map((opt, i) => (
          <Pressable
            key={i}
            disabled={!!feedback}
            onPress={() => award(i === r.correctIndex, r.reason)}
            style={{
              padding: 14,
              borderRadius: 10,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>{opt}</Text>
          </Pressable>
        ))}
      </View>
      <FeedbackBlock feedback={feedback} next={next} />
    </Card>
  );
}

// Discard Decision
function DiscardBody({ round, feedback, award, next }: BodyProps) {
  const { theme } = useTheme();
  const r = DISCARD_ROUNDS[round % DISCARD_ROUNDS.length];
  return (
    <Card variant="elevated" padding={18}>
      <Text style={{ color: theme.textSubtle, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
        VISIBLE EXPOSURES
      </Text>
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600', marginTop: 4, lineHeight: 20 }}>
        {r.exposures}
      </Text>
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', marginTop: 14 }}>
        Which tile is safest to discard?
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
          marginTop: 14,
          justifyContent: 'center',
        }}
      >
        {r.hand.map((t, i) => (
          <Pressable
            key={i}
            disabled={!!feedback}
            onPress={() => award(i === r.correctIndex, r.reason)}
          >
            <Tile suit={t.suit} value={t.value} size="md" />
          </Pressable>
        ))}
      </View>
      <FeedbackBlock feedback={feedback} next={next} />
    </Card>
  );
}

// Joker Swap Drill
function JokerSwapBody({ round, feedback, award, next }: BodyProps) {
  const { theme } = useTheme();
  const r = JOKER_SWAP_ROUNDS[round % JOKER_SWAP_ROUNDS.length];
  return (
    <Card variant="elevated" padding={18}>
      <Tile suit="joker" size="lg" style={{ alignSelf: 'center', marginBottom: 12 }} />
      <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700', lineHeight: 22, textAlign: 'center' }}>
        {r.description}
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <Pressable
          disabled={!!feedback}
          onPress={() => award(r.legal === true, r.legal ? 'Yes — that is a legal swap.' : 'No — that swap breaks the rules.')}
          style={{
            flex: 1,
            paddingVertical: 16,
            borderRadius: 12,
            backgroundColor: '#10B981',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>LEGAL</Text>
        </Pressable>
        <Pressable
          disabled={!!feedback}
          onPress={() => award(r.legal === false, r.legal ? 'Actually — that swap IS legal.' : 'Right — illegal swap.')}
          style={{
            flex: 1,
            paddingVertical: 16,
            borderRadius: 12,
            backgroundColor: '#DC2626',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>ILLEGAL</Text>
        </Pressable>
      </View>
      <FeedbackBlock feedback={feedback} next={next} />
    </Card>
  );
}

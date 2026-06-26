import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  authStats: defineTable({
    date: v.string(),
    provider: v.string(),
    signups: v.number(),
    lastUpdated: v.number(),
  })
    .index("date_provider", ["date", "provider"])
    .index("date", ["date"]),

  automations: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    enabled: v.boolean(),
    archived: v.optional(v.boolean()),
    triggerType: v.union(v.literal("scheduled"), v.literal("data_event")),
    schedule: v.optional(v.object({
      type: v.union(v.literal("interval"), v.literal("cron"), v.literal("once")),
      intervalMinutes: v.optional(v.number()),
      cronExpression: v.optional(v.string()),
      runAt: v.optional(v.number()),
      timezone: v.optional(v.string()),
    })),
    dataEvent: v.optional(v.object({
      tableName: v.string(),
      event: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
      filter: v.optional(v.string()),
    })),
    actionPath: v.string(),
    actionArgs: v.optional(v.string()),
    type: v.optional(v.union(v.literal("email"), v.literal("general"))),
    lastRunAt: v.optional(v.number()),
    lastRunStatus: v.optional(v.union(v.literal("success"), v.literal("failure"))),
    nextScheduledRunId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_enabled", ["enabled"])
    .index("by_trigger_type", ["triggerType", "enabled"]),

  automation_runs: defineTable({
    automationId: v.id("automations"),
    status: v.union(v.literal("running"), v.literal("success"), v.literal("failure")),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    output: v.optional(v.string()),
    triggeredBy: v.union(v.literal("schedule"), v.literal("data_event"), v.literal("manual")),
    eventPayload: v.optional(v.string()),
  })
    .index("by_automation", ["automationId", "startedAt"])
    .index("by_status", ["status", "startedAt"]),

  profiles: defineTable({
    userId: v.string(),
    displayName: v.string(),
    avatarSeed: v.optional(v.string()),
    xp: v.number(),
    level: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastActiveDate: v.string(),
    gamesPlayed: v.number(),
    gamesWon: v.number(),
    lessonsCompleted: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_xp", ["xp"]),

  badges: defineTable({
    userId: v.string(),
    badgeId: v.string(),
    awardedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_badge", ["userId", "badgeId"]),

  gameResults: defineTable({
    userId: v.string(),
    won: v.boolean(),
    handPatternId: v.optional(v.string()),
    points: v.number(),
    durationMs: v.number(),
    playedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_played", ["playedAt"]),

  // ── Real-time multiplayer rooms ─────────────────────────────────────────
  rooms: defineTable({
    code: v.string(), // 6-char invite code
    hostUserId: v.string(),
    hostName: v.string(),
    mode: v.union(v.literal("ranked"), v.literal("casual"), v.literal("private")),
    status: v.union(
      v.literal("waiting"),
      v.literal("starting"),
      v.literal("in_progress"),
      v.literal("finished"),
      v.literal("abandoned")
    ),
    seats: v.array(
      v.object({
        userId: v.optional(v.string()),
        name: v.string(),
        avatarSeed: v.optional(v.string()),
        elo: v.number(),
        ready: v.boolean(),
        isAI: v.boolean(),
        wind: v.union(v.literal("E"), v.literal("S"), v.literal("W"), v.literal("N")),
      })
    ),
    eloAvg: v.number(),
    turnSeat: v.optional(v.number()),
    turnDeadline: v.optional(v.number()),
    // Monotonic move-sequence counter, allocated atomically on the room doc to
    // avoid duplicate seq values under concurrent move submissions (TOCTOU).
    moveSeq: v.optional(v.number()),
    lastActionAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_status", ["status", "lastActionAt"])
    .index("by_mode_status", ["mode", "status"]),

  // Authoritative move log (for replay + state sync)
  roomMoves: defineTable({
    roomId: v.id("rooms"),
    seq: v.number(),
    seat: v.number(),
    userId: v.optional(v.string()),
    type: v.string(), // "discard" | "draw" | "call_pung" | "call_kong" | "mahjong" | "chat"
    payload: v.string(), // JSON-encoded move data
    at: v.number(),
  })
    .index("by_room_seq", ["roomId", "seq"])
    .index("by_room_at", ["roomId", "at"]),

  // Durable, database-backed rate-limit state (sliding window per user).
  // Replaces the in-memory map that reset on every Convex cold start.
  rateLimits: defineTable({
    key: v.string(), // e.g. userId, or `${userId}:${action}`
    hits: v.array(v.number()), // request timestamps within the current window
  }).index("by_key", ["key"]),

  // Matchmaking queue
  matchmakingQueue: defineTable({
    userId: v.string(),
    displayName: v.string(),
    elo: v.number(),
    mode: v.union(v.literal("ranked"), v.literal("casual")),
    joinedAt: v.number(),
    matchedRoomId: v.optional(v.id("rooms")),
  })
    .index("by_mode_elo", ["mode", "elo"])
    .index("by_user", ["userId"]),

  // ── Sparrow Rating System (SRS) ─────────────────────────────────────────
  // Current Glicko-2 rating per player.
  ratings: defineTable({
    userId: v.string(),
    R: v.number(), // rating
    RD: v.number(), // rating deviation
    sigma: v.number(), // volatility
    gamesPlayed: v.number(),
    provisional: v.boolean(), // RD >= 150
    tier: v.string(), // tier name for the current R
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_rating", ["R"]),

  // Append-only rating history for sparkline / trend.
  ratingHistory: defineTable({
    userId: v.string(),
    R: v.number(),
    RD: v.number(),
    tier: v.string(),
    timestamp: v.number(),
    sessionId: v.id("ratingSessions"),
  }).index("by_user", ["userId"]),

  // A rated session: up to 4 seats with entered final point totals + 2-of-4
  // corroboration before the Glicko-2 update is applied.
  ratingSessions: defineTable({
    createdBy: v.string(),
    seats: v.array(
      v.object({
        userId: v.optional(v.string()), // absent for guests
        name: v.string(),
        enteredTotal: v.number(), // final session points entered
        confirmed: v.boolean(), // this seat confirmed the totals
      })
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("corroborated"),
      v.literal("rated"),
      v.literal("disputed")
    ),
    createdAt: v.number(),
    ratedAt: v.optional(v.number()),
    // Per-seat rating outcome, filled in when the session is rated.
    results: v.optional(
      v.array(
        v.object({
          userId: v.optional(v.string()),
          name: v.string(),
          ngs: v.number(),
          beforeR: v.number(),
          afterR: v.number(),
          delta: v.number(),
          tier: v.string(),
        })
      )
    ),
  })
    .index("by_creator", ["createdBy"])
    .index("by_status", ["status"]),
});

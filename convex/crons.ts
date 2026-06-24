import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Watchdog: scan in-progress rooms every minute and force-advance
// turns whose 30-second deadline has elapsed. Also abandons rooms
// inactive for 10+ minutes.
crons.interval(
  "turn-watchdog",
  { minutes: 1 },
  internal.edgeSecurity.sweepStalledTurns
);

export default crons;

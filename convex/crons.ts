import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily snapshot at midnight UTC (D3)
crons.cron(
  "daily snapshot",
  "0 0 * * *",
  internal.brain.createDailySnapshots
);

export default crons;

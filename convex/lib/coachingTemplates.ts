/**
 * Rule-based coaching message template engine (FR18).
 * CRITICAL: All functions are PURE — no Date.now(), no Math.random(), no database access.
 * Deterministic: same inputs always produce same outputs (NFR17).
 */

// ─── Types ──────────────────────────────────────────────────────────

// Inline type — do NOT import from lib/types.ts (client-side, cross-boundary violation)
type Stage = "baby" | "toddler" | "kid" | "teen" | "adult" | "master" | "guru";

export type CoachingCategory =
  | "reinforcement"
  | "correction"
  | "encouragement"
  | "streak"
  | "recovery"
  | "anti_gaming"
  | "transition"
  | "comeback"   // Story 5.7 — FR24
  | "onboarding"; // Story 6.2 — FR31

export interface CoachingInput {
  complianceScore: number; // 0.0–1.0
  streakDays: number;
  antiGamingFlags: string[];
  delta: number;
  isRecoveryLock: boolean;
  tradeTimestamp: number; // used as deterministic seed
  currentStage: Stage;   // used for personality voice wrapper (FR19)
  // Story 4.3: optional data fields — when present and closedTradeCount ≥ 3,
  // data-referenced template arrays are used instead of generic ones (FR22).
  userWinRate?: number;             // 0.0–1.0 — historical win rate (wins / closed)
  overallCompliancePercent?: number; // 0.0–1.0 — recent compliance aggregate
  closedTradeCount?: number;        // total closed trades (threshold guard)
}

export interface CoachingOutput {
  message: string;
  category: CoachingCategory;
  disclaimer: string;
}

// ─── Disclaimer (FR23) ─────────────────────────────────────────────

export const COACHING_DISCLAIMER =
  "Based on your logged data only. Not financial advice.";

// ─── Template Arrays ────────────────────────────────────────────────

const REINFORCEMENT_TEMPLATES = [
  "Perfect execution! Every rule followed — this is how mastery is built.",
  "Flawless discipline on this trade. Your process is working — trust it.",
  "Full compliance. This is the kind of consistency that separates good traders from great ones.",
  "Every rule checked off. Your future self will thank you for this discipline.",
  "Textbook execution. Keep stacking these and watch your brain grow.",
  "All rules followed — your process is becoming second nature.",
];

const ENCOURAGEMENT_TEMPLATES = [
  "Solid effort — a few rules slipped but you're on the right track.",
  "Good awareness on most rules. Tighten up the gaps and you'll be fully compliant next time.",
  "Partial compliance is still progress. Focus on the rules you missed.",
  "You're getting closer. Review the rules that slipped and make them non-negotiable.",
  "Decent execution with room to improve. Which rule tripped you up?",
  "Not bad — but 'not bad' isn't your ceiling. Aim for full compliance next trade.",
];

const CORRECTION_TEMPLATES = [
  "Time to refocus — review your checklist before the next trade.",
  "Multiple rules broken. Step back, breathe, and re-read your playbook.",
  "This trade shows your process needs attention. What went wrong?",
  "Discipline slipped hard here. Are you trading your plan or your emotions?",
  "Several rules ignored. Consider taking a break before your next trade.",
  "Your checklist exists for a reason — use it. Every rule matters.",
];

const STREAK_TEMPLATES = [
  "Discipline streak is on fire! {streakDays} days of consistent execution.",
  "{streakDays}-day streak! Your brain is literally growing from this consistency.",
  "Streak multiplier active at {streakDays} days. Keep this momentum going!",
  "{streakDays} days of discipline in a row. This is what mastery looks like.",
  "Your {streakDays}-day streak is earning bonus points. Stay locked in!",
];

const RECOVERY_TEMPLATES = [
  "Recovery mode active — quality over quantity right now.",
  "Take it slow during recovery. Focus on your best setups only.",
  "Recovery lock is on. Use this time to review your process, not force trades.",
  "Patience during recovery builds stronger discipline than rushing back.",
  "Limited trades during recovery. Make each one count.",
];

const ANTI_GAMING_TEMPLATES = [
  "This trade was flagged — focus on process, not shortcuts.",
  "The system detected unusual activity. Genuine discipline can't be faked.",
  "Flagged trade — no score contribution. Trade with intention, not volume.",
  "Quality over quantity. Flagged trades don't help your brain grow.",
  "This one didn't count. Focus on deliberate, rule-following trades.",
];

// "transition", "comeback", and "onboarding" are excluded — each has its own dedicated generator
type NonTransitionCategory = Exclude<CoachingCategory, "transition" | "comeback" | "onboarding">;

const TEMPLATE_MAP: Record<NonTransitionCategory, string[]> = {
  reinforcement: REINFORCEMENT_TEMPLATES,
  encouragement: ENCOURAGEMENT_TEMPLATES,
  correction: CORRECTION_TEMPLATES,
  streak: STREAK_TEMPLATES,
  recovery: RECOVERY_TEMPLATES,
  anti_gaming: ANTI_GAMING_TEMPLATES,
};

// ─── Data-Referenced Template Arrays (FR22) ─────────────────────────
// Used when closedTradeCount >= 3. Placeholders filled at runtime:
// {winRate}, {compliancePercent}, {closedTradeCount}, {streakDays}

const REINFORCEMENT_DATA_TEMPLATES = [
  "Perfect execution! Your {compliancePercent}% compliance rate is building a real edge.",
  "Full compliance. With a {winRate}% win rate across {closedTradeCount} trades, your process is working.",
  "Every rule followed. Your {compliancePercent}% compliance trend says you're internalising this.",
  "Textbook execution. {winRate}% win rate + {compliancePercent}% compliance — this is the formula.",
];

const ENCOURAGEMENT_DATA_TEMPLATES = [
  "A few rules slipped, but your {winRate}% win rate says your edge is real — protect it with compliance.",
  "Partial compliance. Your {compliancePercent}% overall rate is trending — keep tightening.",
  "Getting closer. Across {closedTradeCount} trades you're showing growth — one rule at a time.",
  "Not full compliance, but your {winRate}% win rate proves the setup works. Follow the rules to compound it.",
];

const CORRECTION_DATA_TEMPLATES = [
  "Multiple rules broken. Your {compliancePercent}% compliance rate is dragging your edge down.",
  "Discipline slipped. With {closedTradeCount} trades logged, your data shows you're capable of better.",
  "Your checklist exists for a reason. Your {winRate}% win rate deserves better process execution.",
  "Rules ignored. At {compliancePercent}% compliance you're leaving score points on the table.",
];

const STREAK_DATA_TEMPLATES = [
  "{streakDays}-day streak! Your {compliancePercent}% compliance rate confirms the momentum is real.",
  "{streakDays} days of discipline — and your {winRate}% win rate shows it's paying off.",
  "Streak multiplier active at {streakDays} days. Your {compliancePercent}% compliance is becoming identity.",
  "{streakDays}-day run with {compliancePercent}% compliance across {closedTradeCount} trades. This is edge.",
];

const RECOVERY_DATA_TEMPLATES = [
  "Recovery mode. Your {compliancePercent}% compliance history shows you know how to trade correctly.",
  "Quality over quantity. {closedTradeCount} trades in — your data knows what a good setup looks like.",
  "Recovery lock active. Your {winRate}% win rate was earned with discipline. Get back to that.",
];

const ANTI_GAMING_DATA_TEMPLATES = [
  "Flagged trade. Your real edge — built across {closedTradeCount} trades — doesn't need shortcuts.",
  "The system flagged this. Your {compliancePercent}% compliance history is worth protecting.",
];

const DATA_TEMPLATE_MAP: Record<NonTransitionCategory, string[]> = {
  reinforcement: REINFORCEMENT_DATA_TEMPLATES,
  encouragement: ENCOURAGEMENT_DATA_TEMPLATES,
  correction: CORRECTION_DATA_TEMPLATES,
  streak: STREAK_DATA_TEMPLATES,
  recovery: RECOVERY_DATA_TEMPLATES,
  anti_gaming: ANTI_GAMING_DATA_TEMPLATES,
};

// ─── Stage Voice Intros (FR19) ───────────────────────────────────────
// Personality is applied as a wrapper (prefix) around the base coaching message.
// 4 intros per stage for variety; selection is deterministic via (tradeTimestamp >> 3) % 4.
// Keep intros short (1-4 words + space) — the base message carries the substance.

const STAGE_VOICE: Record<Stage, string[]> = {
  baby: [
    "Ooh! ",
    "Wow, this is new! ",
    "Hmm, let me think... ",
    "Oh! Oh! ",
  ],
  toddler: [
    "Yay! ",
    "Ooh, doing it! ",
    "More! More! ",
    "Look what happened! ",
  ],
  kid: [
    "Awesome! ",
    "Level up! ",
    "Here we go! ",
    "Cool! ",
  ],
  teen: [
    "Real talk: ",
    "Straight up — ",
    "No sugarcoating: ",
    "Brutal truth: ",
  ],
  adult: [
    "Noted. ",
    "Analysis: ",
    "Observation: ",
    "Data says: ",
  ],
  master: [
    "Consider this: ",
    "Wisdom check — ",
    "The pattern reveals: ",
    "A master notes: ",
  ],
  guru: [
    "In the stillness between trades, ",
    "The market is a mirror — ",
    "As the ancient traders knew: ",
    "All paths lead here: ",
  ],
};

// ─── Deterministic Template Selection ───────────────────────────────

/**
 * Selects a template deterministically using a numeric seed.
 * No Math.random() — uses modulo for Convex mutation safety.
 */
export function selectTemplate(templates: string[], seed: number): string {
  const index = Math.abs(seed) % templates.length;
  return templates[index];
}

/** Formats a 0.0–1.0 ratio as a whole-number percentage string (e.g. 0.682 → "68%"). */
function formatPercent(n: number): string {
  return (n * 100).toFixed(0) + "%";
}

// ─── Main Coaching Generator ────────────────────────────────────────

/**
 * Generates a coaching message based on trade scoring results.
 * Pure function — deterministic, no side effects (NFR5, NFR17).
 *
 * Priority order:
 * 1. Anti-gaming flags (blocking flags → anti_gaming message)
 * 2. Recovery lock active → recovery message
 * 3. Streak ≥ 5 days → streak message (overrides compliance)
 * 4. Compliance ≥ 0.9 → reinforcement
 * 5. Compliance 0.5–0.89 → encouragement
 * 6. Compliance < 0.5 → correction
 */
export function generateCoachingMessage(input: CoachingInput): CoachingOutput {
  const { complianceScore, streakDays, antiGamingFlags, isRecoveryLock, tradeTimestamp, currentStage } = input;

  let category: NonTransitionCategory;

  // 1. Anti-gaming takes highest priority
  const blockingFlags = [
    "phantom_trade_detected",
    "recovery_lock_limit",
  ];
  const hasBlockingFlag = antiGamingFlags.some((f) => blockingFlags.includes(f));

  if (hasBlockingFlag) {
    category = "anti_gaming";
  }
  // 2. Recovery lock (advisory, not blocking)
  else if (isRecoveryLock) {
    category = "recovery";
  }
  // 3. Streak bonus (only for compliant trades)
  else if (streakDays >= 5 && complianceScore >= 0.9) {
    category = "streak";
  }
  // 4-6. Compliance-based
  else if (complianceScore >= 0.9) {
    category = "reinforcement";
  } else if (complianceScore >= 0.5) {
    category = "encouragement";
  } else {
    category = "correction";
  }

  // Task 3.1-3.2: select data-referenced templates when sufficient trade history exists (FR22)
  const hasData = (input.closedTradeCount ?? 0) >= 3;
  const templates = hasData ? DATA_TEMPLATE_MAP[category] : TEMPLATE_MAP[category];
  let baseMessage = selectTemplate(templates, tradeTimestamp);

  // Task 3.3: interpolate all placeholders (generic + data-referenced)
  baseMessage = baseMessage.replace(/\{streakDays\}/g, String(streakDays));
  baseMessage = baseMessage.replace(/\{winRate\}/g, formatPercent(input.userWinRate ?? 0));
  baseMessage = baseMessage.replace(/\{compliancePercent\}/g, formatPercent(input.overallCompliancePercent ?? 0));
  baseMessage = baseMessage.replace(/\{closedTradeCount\}/g, String(input.closedTradeCount ?? 0));

  // Task 3.4: apply stage personality voice prefix AFTER all placeholder substitution (FR19)
  const introIndex = Math.abs(tradeTimestamp >> 3) % 4;
  const intro = STAGE_VOICE[currentStage][introIndex];
  const message = intro + baseMessage;

  return {
    message,
    category,
    disclaimer: COACHING_DISCLAIMER,
  };
}

// ─── Stage Transition Messages (FR20, FR21) ──────────────────────────
// generateTransitionMessage() is called INSTEAD of generateCoachingMessage()
// when stageChanged === true in the scoring pipeline.

export interface TransitionInput {
  previousStage: Stage;
  newStage: Stage;
  daysInPreviousStage: number; // days spent in the stage being left
  tradeTimestamp: number;       // deterministic seed
  isEvolution: boolean;         // true = evolved up, false = regressed down
  closedTradeCount?: number;    // reserved for future data-referenced transition templates
  userWinRate?: number;         // reserved for future data-referenced transition templates
}

// Farewell templates — spoken by the stage being left (4 per stage)
const FAREWELL_TEMPLATES: Record<Stage, string[]> = {
  baby: [
    "Your baby steps led you here — {daysInStage} days of curiosity well spent.",
    "Time to leave the nest! {daysInStage} days as a Baby built your foundation.",
    "Baby stage complete. {daysInStage} days of wondering — now you'll start knowing.",
    "{daysInStage} days as a Baby. Your curiosity paid off.",
  ],
  toddler: [
    "You outgrew the Toddler stage in {daysInStage} days. Your wobbles became strides.",
    "{daysInStage} days as a Toddler — finding your feet is over. Now you walk with intent.",
    "Toddler stage done. {daysInStage} days of small wins. They added up.",
    "After {daysInStage} days as a Toddler, the stumbling is behind you.",
  ],
  kid: [
    "After {daysInStage} days as a Kid, you've outgrown the playground.",
    "The Kid is growing up! {daysInStage} days of learning — now it gets real.",
    "{daysInStage} days of pure hustle as a Kid. Time for the next challenge.",
    "Kid stage done. {daysInStage} days built your foundation — now use it.",
  ],
  teen: [
    "After {daysInStage} days as a Teen, the raw edge is sharpened.",
    "{daysInStage} days of teenage fire — channelled into something real.",
    "Teen stage: {daysInStage} days of learning what NOT to do. Worth every loss.",
    "The teenage phase ends after {daysInStage} days. Growth hurts — growth won.",
  ],
  adult: [
    "{daysInStage} days as an Adult trader. You traded with clarity.",
    "Adult stage complete. {daysInStage} days of analytical precision.",
    "Leaving the Adult stage after {daysInStage} days. The data was with you.",
    "{daysInStage} days of disciplined adulthood. The next chapter begins.",
  ],
  master: [
    "{daysInStage} days as a Master. Few reach this. Fewer leave it still improving.",
    "Master stage: {daysInStage} days of deep refinement. The edge was real.",
    "After {daysInStage} days mastering your craft, a new horizon opens.",
    "{daysInStage} days at Master level. Your consistency earned the next step.",
  ],
  guru: [
    "{daysInStage} days as a Guru. The highest expression of this craft.",
    "After {daysInStage} days at Guru level, even the market reflects your patience.",
    "{daysInStage} days of Guru-level discipline. The journey never truly ends.",
    "Guru stage: {daysInStage} days. In trading, as in life, the student always remains.",
  ],
};

// Welcome templates — spoken by the new stage on evolution upward (4 per stage)
const WELCOME_TEMPLATES: Record<Stage, string[]> = {
  baby: [
    "Welcome. Every journey begins here.",
    "The Baby stage: your first step into mastery.",
    "Curiosity is your superpower right now. Use it.",
    "Welcome, Baby brain. The road ahead is everything.",
  ],
  toddler: [
    "Welcome to Toddler! Your brain is finding its legs.",
    "Toddler stage unlocked! Every step forward is a victory.",
    "You're a Toddler now — clumsy, curious, and growing fast.",
    "The Toddler stage begins. Small wins compound into big ones.",
  ],
  kid: [
    "Welcome to the Kid stage! Time to start building real patterns.",
    "Kid unlocked! The rules are clicking — keep going.",
    "You've levelled up to Kid. The game just got more interesting.",
    "Kid stage: where curiosity becomes skill. You earned it.",
  ],
  teen: [
    "Welcome to Teen! Raw drive plus growing knowledge — watch out.",
    "Teen stage unlocked. The edge starts to sharpen here.",
    "You're a Teen now — intensity + pattern recognition. Dangerous combo.",
    "Teen stage: brutal self-awareness begins. You're ready for it.",
  ],
  adult: [
    "Welcome to Adult. Clarity over reaction, data over emotion.",
    "Adult stage unlocked. The discipline is starting to compound.",
    "You've earned the Adult stage. Now you trade the plan, not the noise.",
    "Adult: where real consistency lives. Welcome.",
  ],
  master: [
    "Welcome to Master. This is where the few operate.",
    "Master stage unlocked. Your process is a weapon.",
    "Master: consistent, disciplined, dangerous. Welcome.",
    "You've reached Master. Every rule you followed brought you here.",
  ],
  guru: [
    "Welcome to Guru. The market has nothing left to teach you — only remind you.",
    "Guru stage. The highest state. The market is an old friend now.",
    "Guru unlocked. Patience, process, presence — you have all three.",
    "Guru stage: where the noise becomes signal. You've arrived.",
  ],
};

// Welcome-back templates — spoken by the new stage on regression downward (4 per stage)
const WELCOME_BACK_TEMPLATES: Record<Stage, string[]> = {
  baby: [
    "Back to Baby. Every reset is a chance to rebuild stronger.",
    "Starting over at Baby. The fundamentals exist for a reason.",
    "Baby stage, again. The basics aren't punishment — they're protection.",
    "Reset to Baby. This is the foundation. Use it.",
  ],
  toddler: [
    "Back to Toddler. Slow down. Your foundation needs attention.",
    "Toddler again. Return to basics — they always work.",
    "Welcome back to Toddler. The wobbles are temporary if you focus.",
    "Reset to Toddler. Crawl before you run — again.",
  ],
  kid: [
    "Back to Kid. The discipline that got you here still lives in you.",
    "Kid stage again. This is where you rebuild your process.",
    "Welcome back, Kid. Take your time. Your real level is still ahead.",
    "Regression to Kid. The path forward goes through the basics.",
  ],
  teen: [
    "Back to Teen. The fire still burns — channel it properly this time.",
    "Regression to Teen. Use this reset to eliminate what cost you.",
    "Teen again. The lessons learned above still count. Use them.",
    "Welcome back to Teen. This is temporary if you trade your system.",
  ],
  adult: [
    "Back to Adult. Reconnect with your analytical edge.",
    "Adult stage, again. Trade the data — not the hope.",
    "Regression to Adult. The discipline that works is already in you.",
    "Welcome back to Adult. Reset and refocus — you know how.",
  ],
  master: [
    "Back to Master. You've been here before. You'll be back higher.",
    "Regression to Master. The craft knowledge doesn't leave with the stage.",
    "Master, again. The discipline that earned this stage once will earn it again.",
    "Welcome back to Master. Your edge is intact — rebuild the consistency.",
  ],
  guru: [
    "Regression from Guru. Even the deepest discipline needs recalibration sometimes.",
    "Back to Guru stage. The wisdom was never gone — just obscured.",
    "Guru again. The market humbles all — including the great. Recalibrate.",
    "Return to Guru. The path back to the peak is shorter when you know the way.",
  ],
};

/**
 * Generates a combined farewell + welcome message on stage transition (FR20, FR21).
 * Pure function — deterministic, no side effects (NFR17).
 * Uses tradeTimestamp for farewell selection and tradeTimestamp + 1 for welcome
 * to guarantee different template indices when array lengths are equal.
 */
export function generateTransitionMessage(input: TransitionInput): CoachingOutput {
  const { previousStage, newStage, daysInPreviousStage, tradeTimestamp, isEvolution } = input;

  const farewellTemplates = FAREWELL_TEMPLATES[previousStage];
  const welcomeTemplates = isEvolution
    ? WELCOME_TEMPLATES[newStage]
    : WELCOME_BACK_TEMPLATES[newStage];

  let farewell = selectTemplate(farewellTemplates, tradeTimestamp);
  let welcome = selectTemplate(welcomeTemplates, tradeTimestamp + 1);

  const days = String(daysInPreviousStage);
  farewell = farewell.replace(/\{daysInStage\}/g, days);
  welcome = welcome.replace(/\{daysInStage\}/g, days);

  return {
    message: farewell + " " + welcome,
    category: "transition",
    disclaimer: COACHING_DISCLAIMER,
  };
}

// ─── Comeback Coaching (FR24, Story 5.7) ─────────────────────────────────────

const COMEBACK_TEMPLATES = [
  "You've been away for {daysSinceLastTrade} days — welcome back. Your brain is at {currentScore}. Let's rebuild.",
  "Back after {daysSinceLastTrade} days. Your score is {currentScore} — momentum starts with this trade.",
  "{daysSinceLastTrade} days offline. Welcome back, {stage}. Your edge is still here.",
  "The comeback starts now. {daysSinceLastTrade} days away — your brain is at {currentScore} and ready to grow.",
];

export interface ComebackInput {
  daysSinceLastTrade: number;  // integer days, ≥ COMEBACK_THRESHOLD_DAYS when called
  currentStage: Stage;         // for personality voice prefix (FR19)
  currentScore: number;        // passed to {currentScore} placeholder
  tradeTimestamp: number;      // deterministic seed — same as other coaching functions
}

/**
 * Generates a comeback message when a trader returns after ≥7 days of inactivity (FR24).
 * Pure function — deterministic, no side effects (NFR17).
 */
export function generateComebackMessage(input: ComebackInput): CoachingOutput {
  const { daysSinceLastTrade, currentStage, currentScore, tradeTimestamp } = input;

  let baseMessage = selectTemplate(COMEBACK_TEMPLATES, tradeTimestamp);
  baseMessage = baseMessage.replace(/\{daysSinceLastTrade\}/g, String(daysSinceLastTrade));
  baseMessage = baseMessage.replace(/\{currentScore\}/g, String(Math.round(currentScore)));
  baseMessage = baseMessage.replace(/\{stage\}/g, currentStage.charAt(0).toUpperCase() + currentStage.slice(1));

  const introIndex = Math.abs(tradeTimestamp >> 3) % 4;
  const intro = STAGE_VOICE[currentStage][introIndex];
  const message = intro + baseMessage;

  return {
    message,
    category: "comeback",
    disclaimer: COACHING_DISCLAIMER,
  };
}

// ─── Onboarding First Message (FR31, Story 6.2) ──────────────────────────────

// Market-specific Baby Brain templates (AC: #2–#5).
// Rules: include market name, express wonder/curiosity, invite engagement,
// NO statistics, NO advice, pure curious/innocent Baby voice (no STAGE_VOICE prefix —
// these templates ARE the baby voice directly).
const FIRST_MESSAGE_TEMPLATES: Record<string, string[]> = {
  crypto: [
    "Ooh! You trade crypto! I've never seen a real trade before — can you show me one?",
    "Crypto! Is that real money? I just hatched and I'm already curious about everything you do!",
    "You trade crypto! There are so many coins — which one do you like? I want to learn!",
    "Crypto trading! I heard it moves really fast. I'll try to keep up — show me your first trade?",
  ],
  stocks: [
    "Whoa! Stock trading! I'm so new to this — tell me about your first trade?",
    "Stocks! Do you pick them yourself? I've never seen a real trade before — I can't wait!",
    "You trade stocks! Are there favorites you like? I'm still learning what everything means!",
    "Stock trading! I just hatched and you're already here — will you show me how this works?",
  ],
  forex: [
    "Currencies! Is that different from other markets? Show me how this works — I'm fascinated!",
    "Forex! That's currencies, right? There are so many pairs — how do you even choose?",
    "You trade currencies! I heard different markets move at different times — teach me?",
    "Forex trading! I just woke up and there's already so much to learn — can you show me a trade?",
  ],
  multi: [
    "You trade multiple markets! That sounds exciting — which one do we start with?",
    "Multiple markets! You must know a lot of things I don't yet — will you teach me?",
    "Wow, you trade everything! I just hatched and I'm already in awe — show me your first trade?",
    "Multi-market trading! I'm not sure where to look first — I'll follow your lead!",
  ],
};

export interface FirstMessageInput {
  primaryMarket: string;  // 'crypto' | 'stocks' | 'forex' | 'multi' from OnboardingWizard
  initialCapital: number; // collected but reserved for future template expansion
  currency: string;       // collected but reserved for future template expansion
  timestamp: number;      // Unix ms — deterministic seed for selectTemplate
}

/**
 * Generates Baby Brain's first personalized greeting based on the user's onboarding market selection (FR31).
 * Pure function — deterministic, no side effects (NFR17).
 * No STAGE_VOICE prefix — the templates themselves are Baby Brain's direct voice.
 */
export function generateFirstMessage(input: FirstMessageInput): CoachingOutput {
  const { primaryMarket, timestamp } = input;
  // Normalise to a known market key; unknown values fall back to 'multi'
  const market = FIRST_MESSAGE_TEMPLATES[primaryMarket] ? primaryMarket : "multi";
  const message = selectTemplate(FIRST_MESSAGE_TEMPLATES[market], timestamp);
  return {
    message,
    category: "onboarding",
    disclaimer: COACHING_DISCLAIMER,
  };
}

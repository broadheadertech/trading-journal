import { Trade } from './types';

/**
 * Migrate a raw trade object (possibly from localStorage or an old schema)
 * to the current Trade shape. Safe for both client and Convex server usage.
 */
export function migrateTrade(t: any): Trade {
  return {
    ...t,
    ruleChecklist: (t.ruleChecklist ?? []).map((r: any) => ({
      rule: r.rule,
      compliance: r.compliance ?? (r.followed !== false ? 'yes' : 'no'),
    })),
    stopLoss: t.stopLoss ?? null,
    setupConfidence: t.setupConfidence ?? t.confidence ?? 5,
    executionConfidence: t.executionConfidence ?? t.confidence ?? 5,
    setupNotes: t.setupNotes ?? '',
    executionNotes: t.executionNotes ?? '',
    lessonNotes: t.lessonNotes ?? '',
    oneThingNote: t.oneThingNote ?? '',
    selfVerdict: t.selfVerdict ?? null,
    lossHypothesis: t.lossHypothesis ?? null,
    exitEmotion: t.exitEmotion ?? null,
    screenshots: t.screenshots ?? [],
    marketType: t.marketType ?? 'crypto',
    direction: t.direction ?? 'long',
    leverage: t.leverage ?? null,
    fees: t.fees ?? null,
    funding: t.funding ?? null,
    margin: t.margin ?? null,
    followedPlan: t.followedPlan ?? null,
    visibility: t.visibility ?? 'private',
    // FX-style logging fields default to undefined so legacy trades render
    // their existing shape without phantom data appearing.
    session: t.session,
    entryType: t.entryType,
    timeframeAnalysis: t.timeframeAnalysis,
    timeframeEntry: t.timeframeEntry,
    bias: t.bias,
    takeProfit: t.takeProfit ?? null,
    lotSize: t.lotSize ?? null,
    amount: t.amount ?? null,
    targetPips: t.targetPips ?? null,
    pipGain: t.pipGain ?? null,
    source: t.source,
    totalTradesAtEntry: t.totalTradesAtEntry,
    totalWinAmountAtEntry: t.totalWinAmountAtEntry,
  };
}

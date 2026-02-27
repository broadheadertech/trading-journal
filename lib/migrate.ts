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
  };
}

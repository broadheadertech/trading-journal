import { Trade, Strategy, PreTradeChecklist, JournalEntry } from './types';

export const storage = {
  /**
   * Export all current Convex data as a JSON string.
   * Call with the live data from hooks (not localStorage).
   */
  exportAll: (data: {
    trades: Trade[];
    strategies: Strategy[];
    checklists: PreTradeChecklist[];
    entries: JournalEntry[];
  }): string => {
    return JSON.stringify(
      {
        trades: data.trades,
        strategies: data.strategies,
        checklists: data.checklists,
        journal: data.entries,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  },
};

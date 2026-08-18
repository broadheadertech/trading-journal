'use client';

import { useState, useEffect } from 'react';
import TradesLog from './TradesLog';
import PsychologyJournal from './PsychologyJournal';
import Verdicts from './Verdicts';
import Analytics from './Analytics';
import Reports from './Reports';
import Playbook from './Playbook';
import PreTradeChecklist from './PreTradeChecklist';
import Goals from './Goals';
import WhatIfSimulation from './WhatIfSimulation';
import Achievements from './Achievements';
import UpgradePrompt from './UpgradePrompt';
import { getRequiredTier } from '@/lib/features';
import { useSubscription } from '@/hooks/useSubscription';
import type { Trade, Strategy, TabId } from '@/lib/types';

export type JournalSubTab =
  | 'trades' | 'psychology' | 'verdicts'
  | 'performance' | 'reports' | 'playbook'
  | 'checklist' | 'goals' | 'whatif' | 'achievements';

interface Props {
  initialSubTab?: JournalSubTab;
  // Trades
  trades: Trade[];
  strategies: Strategy[];
  addTrade: any;
  updateTrade: any;
  deleteTrade: (id: string) => void;
  bulkImportTrades?: any;
  showAddTrade: boolean;
  onCloseAddModal: () => void;
  onRuleBreak: (ruleName: string, explanation: string) => void;
  initialCapital: number;
  onAddTrade: () => void;
  // Psychology
  entries: any[];
  addEntry: any;
  updateEntry: any;
  deleteEntry: (id: string) => void;
  breakerEvents: any[];
  triggers: any[];
  addTrigger: any;
  deleteTrigger: (id: string) => void;
  reflections: any[];
  addReflection: any;
  reviews: any[];
  addReview: any;
  // Playbook
  addStrategy: any;
  updateStrategy: any;
  deleteStrategy: (id: string) => void;
  // Checklist
  checklists: any[];
  addChecklist: any;
  deleteChecklist: (id: string) => void;
  // Goals
  goals: any[];
  addGoal: any;
  updateGoal: any;
}

// Text-only labels — the ATLAS reference renders this strip as a single row of
// plain-text tabs; per-tab icons pushed the 10 tabs onto a second line.
const SUB_TABS: { id: JournalSubTab; label: string; gate?: TabId }[] = [
  { id: 'trades',       label: 'Trades' },
  { id: 'psychology',   label: 'Psychology' },
  { id: 'verdicts',     label: 'Verdicts',       gate: 'verdicts' },
  { id: 'performance',  label: 'Performance' },
  { id: 'reports',      label: 'Reports',        gate: 'reports' },
  { id: 'playbook',     label: 'Playbook' },
  { id: 'checklist',    label: 'Market Context', gate: 'checklist' },
  { id: 'goals',        label: 'Goals',          gate: 'goals' },
  { id: 'whatif',       label: 'What-If',        gate: 'whatif' },
  { id: 'achievements', label: 'Achievements' },
];

export default function JournalTab(props: Props) {
  const { canAccessTab } = useSubscription();
  const [sub, setSub] = useState<JournalSubTab>(props.initialSubTab ?? 'trades');

  useEffect(() => {
    if (props.initialSubTab) setSub(props.initialSubTab);
  }, [props.initialSubTab]);

  const gated = (gate: TabId | undefined, node: React.ReactNode) =>
    !gate || canAccessTab(gate) ? node : <UpgradePrompt requiredTier={getRequiredTier(gate)} />;

  return (
    <div className="space-y-6">
      <div className="tabs">
        {SUB_TABS.map((t) => {
          const active = sub === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              className={active ? 'on' : undefined}
              style={{ whiteSpace: 'nowrap' }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* The "Interactive Trade Journal" hero lives in <TradesLog/> — rendering it here
          as well stacked two identical cards on top of each other. */}
      {sub === 'trades' && (
        <TradesLog
          trades={props.trades}
          strategies={props.strategies}
          onAdd={props.addTrade}
          onUpdate={props.updateTrade}
          onDelete={props.deleteTrade}
          onBulkImport={props.bulkImportTrades}
          showAddModal={props.showAddTrade}
          onCloseAddModal={props.onCloseAddModal}
          onRuleBreak={props.onRuleBreak}
          initialCapital={props.initialCapital}
        />
      )}

      {sub === 'psychology' && (
        <PsychologyJournal
          trades={props.trades}
          entries={props.entries}
          onAddEntry={props.addEntry}
          onUpdateEntry={props.updateEntry}
          onDeleteEntry={props.deleteEntry}
          breakerEvents={props.breakerEvents}
          triggers={props.triggers}
          onAddTrigger={props.addTrigger}
          onDeleteTrigger={props.deleteTrigger}
          reflections={props.reflections}
          onAddReflection={props.addReflection}
          reviews={props.reviews}
          onAddReview={props.addReview}
        />
      )}

      {sub === 'verdicts' && gated('verdicts', <Verdicts trades={props.trades} />)}

      {sub === 'performance' && (
        <Analytics
          trades={props.trades}
          initialCapital={props.initialCapital}
          onAddTrade={props.onAddTrade}
        />
      )}

      {sub === 'reports' && gated('reports',
        <Reports trades={props.trades} strategies={props.strategies} />
      )}

      {sub === 'playbook' && (
        <Playbook
          strategies={props.strategies}
          trades={props.trades}
          onAdd={props.addStrategy}
          onUpdate={props.updateStrategy}
          onDelete={props.deleteStrategy}
        />
      )}

      {sub === 'checklist' && gated('checklist',
        <PreTradeChecklist
          checklists={props.checklists}
          strategies={props.strategies}
          trades={props.trades}
          onAdd={props.addChecklist}
          onDelete={props.deleteChecklist}
        />
      )}

      {sub === 'goals' && gated('goals',
        <Goals
          goals={props.goals}
          trades={props.trades}
          onAdd={props.addGoal}
          onUpdate={props.updateGoal}
        />
      )}

      {sub === 'whatif' && gated('whatif', <WhatIfSimulation trades={props.trades} />)}

      {sub === 'achievements' && (
        <Achievements trades={props.trades} reflections={props.reflections} />
      )}
    </div>
  );
}

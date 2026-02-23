'use client';

import { useState } from 'react';
import { Trade } from '@/lib/types';
import { EMOTION_OPTIONS, getRMultiple, getVerdictColor } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { format } from 'date-fns';
import { Edit2, TrendingUp, TrendingDown, Minus, Eye, Zap, RefreshCw, MessageSquare, Star, FlaskConical, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  trade: Trade;
  onEdit: () => void;
}

function MetaSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">{title}</p>
      {children}
    </div>
  );
}

function NoteCard({
  icon,
  label,
  children,
  accent = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  accent?: 'default' | 'amber' | 'purple' | 'blue' | 'orange';
}) {
  const accentClasses = {
    default: 'text-[var(--muted-foreground)]',
    amber: 'text-[var(--yellow)]',
    purple: 'text-[var(--purple)]',
    blue: 'text-[var(--blue)]',
    orange: 'text-[var(--loss)]',
  };
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-2">
      <div className={`flex items-center gap-2 ${accentClasses[accent]}`}>
        <span className="shrink-0">{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest">{label}</span>
      </div>
      {children}
    </div>
  );
}

function EmotionChip({ value }: { value: string }) {
  const opt = EMOTION_OPTIONS.find(e => e.value === value);
  if (!opt) return <span className="text-sm text-[var(--muted-foreground)]">{value}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--muted)] text-sm">
      {opt.emoji} {opt.label}
    </span>
  );
}

export default function TradeDetailView({ trade, onEdit }: Props) {
  const { formatCurrency, formatPrice } = useCurrency();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const isWin = !trade.isOpen && (trade.actualPnLPercent ?? 0) > 0;
  const isLoss = !trade.isOpen && (trade.actualPnLPercent ?? 0) < 0;
  const rMultiple = getRMultiple(trade);

  const complianceIcon = (c: string) => c === 'yes' ? '✓' : c === 'partial' ? '~' : '✗';
  const complianceColor = (c: string) =>
    c === 'yes' ? 'text-[var(--green)]' : c === 'partial' ? 'text-[var(--yellow)]' : 'text-[var(--red)]';

  const hasNotes = trade.setupNotes || trade.executionNotes || trade.lessonNotes || trade.reasoning || trade.oneThingNote || (trade.lossHypothesis && isLoss);
  const hasCharts = trade.screenshots && trade.screenshots.length > 0;

  const goLightbox = (dir: 1 | -1) => {
    if (lightboxIdx === null || !hasCharts) return;
    setLightboxIdx((lightboxIdx + dir + trade.screenshots.length) % trade.screenshots.length);
  };

  return (
    <div className="space-y-5">
      {/* Result Banner */}
      <div className={`rounded-xl p-4 flex items-start justify-between gap-3 ${
        trade.isOpen
          ? 'bg-[var(--muted)]/50 border border-[var(--border)]'
          : isWin
            ? 'bg-green-500/10 border border-green-500/20'
            : 'bg-red-500/10 border border-red-500/20'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-lg">{trade.coin}</span>
            {trade.strategy && (
              <span className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-full">
                {trade.strategy}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {trade.isOpen ? (
              <span className="flex items-center gap-1.5 text-[var(--yellow)] font-semibold">
                <Minus size={16} /> Open Position
              </span>
            ) : isWin ? (
              <span className="flex items-center gap-1.5 text-[var(--green)] font-semibold text-xl">
                <TrendingUp size={18} /> +{trade.actualPnLPercent?.toFixed(2)}%
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[var(--red)] font-semibold text-xl">
                <TrendingDown size={18} /> {trade.actualPnLPercent?.toFixed(2)}%
              </span>
            )}
            {!trade.isOpen && trade.actualPnL !== null && (
              <span className={`text-sm ${isWin ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                ({isWin ? '+' : ''}{formatCurrency(trade.actualPnL ?? 0)})
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-[var(--muted-foreground)]">
            <span>Entry: {format(new Date(trade.entryDate), 'MMM d, yyyy')}</span>
            {trade.exitDate && !trade.isOpen && (
              <span>Exit: {format(new Date(trade.exitDate), 'MMM d, yyyy')}</span>
            )}
          </div>
        </div>
        <button
          onClick={onEdit}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[var(--border)] hover:bg-[var(--muted)] rounded-lg text-[var(--muted-foreground)] transition-colors"
        >
          <Edit2 size={12} /> Edit
        </button>
      </div>

      {/* Chart Screenshots */}
      {hasCharts && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Chart Analysis</p>
          <div className={`grid gap-2 ${trade.screenshots.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {trade.screenshots.map((src, i) => (
              <button
                key={i}
                onClick={() => setLightboxIdx(i)}
                className="relative group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)] aspect-video"
              >
                <img
                  src={src}
                  alt={`Chart ${i + 1}`}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-2 py-1 rounded">
                    View full
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Key numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Entry', value: formatPrice(trade.entryPrice) },
          { label: 'Exit', value: trade.isOpen ? 'Open' : trade.exitPrice ? formatPrice(trade.exitPrice) : '—' },
          { label: 'P&L $', value: trade.isOpen ? '—' : formatCurrency(trade.actualPnL ?? 0), colored: !trade.isOpen },
          { label: 'R-Multiple', value: rMultiple !== null ? `${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(2)}R` : '—', colored: rMultiple !== null },
        ].map(({ label, value, colored }) => (
          <div key={label} className="bg-[var(--muted)]/40 rounded-xl p-3 text-center">
            <p className="text-[10px] text-[var(--muted-foreground)] mb-0.5">{label}</p>
            <p className={`text-sm font-semibold ${colored ? (parseFloat(value) >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]') : ''}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Left column — meta */}
        <div className="space-y-4">
          {(trade.emotion || trade.exitEmotion) && (
            <MetaSection title="Emotions">
              <div className="space-y-1.5">
                {trade.emotion && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--muted-foreground)] w-10 shrink-0">Entry</span>
                    <EmotionChip value={trade.emotion} />
                  </div>
                )}
                {trade.exitEmotion && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--muted-foreground)] w-10 shrink-0">Exit</span>
                    <EmotionChip value={trade.exitEmotion} />
                  </div>
                )}
              </div>
            </MetaSection>
          )}

          <MetaSection title="Confidence">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-[var(--muted)]">
                <div
                  className="h-2 rounded-full bg-[var(--accent)]"
                  style={{ width: `${(trade.confidence / 10) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium">{trade.confidence}/10</span>
            </div>
          </MetaSection>

          {(trade.verdict || trade.selfVerdict) && (
            <MetaSection title="Verdict">
              <div className="flex flex-wrap gap-2">
                {trade.verdict && (
                  <span className={`px-2.5 py-1 rounded-full text-xs border ${getVerdictColor(trade.verdict)}`}>
                    Journal: {trade.verdict}
                  </span>
                )}
                {trade.selfVerdict && (
                  <span className="px-2.5 py-1 rounded-full text-xs border border-[var(--border)] text-[var(--muted-foreground)]">
                    You: {trade.selfVerdict}
                  </span>
                )}
              </div>
            </MetaSection>
          )}

          {trade.tags && trade.tags.length > 0 && (
            <MetaSection title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {trade.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-[var(--muted)] text-xs rounded-full text-[var(--muted-foreground)]">
                    {tag}
                  </span>
                ))}
              </div>
            </MetaSection>
          )}

          {trade.ruleChecklist && trade.ruleChecklist.length > 0 && (
            <MetaSection title="Rules">
              <div className="space-y-1">
                {trade.ruleChecklist.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={`font-bold shrink-0 mt-0.5 ${complianceColor(r.compliance)}`}>
                      {complianceIcon(r.compliance)}
                    </span>
                    <span className={r.compliance === 'no' ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}>
                      {r.rule}
                    </span>
                  </div>
                ))}
              </div>
            </MetaSection>
          )}
        </div>

        {/* Right column — note cards */}
        {hasNotes && (
          <div className="space-y-3">
            {trade.setupNotes && (
              <NoteCard icon={<Eye size={13} />} label="What I Saw" accent="blue">
                <p className="text-sm text-[var(--foreground)] leading-relaxed">{trade.setupNotes}</p>
              </NoteCard>
            )}

            {trade.executionNotes && (
              <NoteCard icon={<Zap size={13} />} label="What I Did" accent="purple">
                <p className="text-sm text-[var(--foreground)] leading-relaxed">{trade.executionNotes}</p>
              </NoteCard>
            )}

            {trade.lessonNotes && (
              <NoteCard icon={<RefreshCw size={13} />} label="What I'd Change" accent="amber">
                <p className="text-sm text-[var(--foreground)] leading-relaxed">{trade.lessonNotes}</p>
              </NoteCard>
            )}

            {trade.reasoning && (
              <NoteCard icon={<MessageSquare size={13} />} label="Why I Entered" accent="default">
                <p className="text-sm text-[var(--foreground)] leading-relaxed">{trade.reasoning}</p>
              </NoteCard>
            )}

            {trade.oneThingNote && (
              <NoteCard icon={<Star size={13} />} label="One Thing" accent="purple">
                <p className="text-sm italic text-[var(--foreground)] leading-relaxed">
                  &ldquo;{trade.oneThingNote}&rdquo;
                </p>
              </NoteCard>
            )}

            {trade.lossHypothesis && isLoss && (
              <NoteCard icon={<FlaskConical size={13} />} label="Loss Hypothesis" accent="orange">
                <p className="text-sm text-[var(--foreground)] leading-relaxed">{trade.lossHypothesis}</p>
              </NoteCard>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && hasCharts && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          <img
            src={trade.screenshots[lightboxIdx]}
            alt={`Chart ${lightboxIdx + 1}`}
            className="max-w-[92vw] max-h-[88vh] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
          {trade.screenshots.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); goLightbox(-1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); goLightbox(1); }}
                className="absolute right-16 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronRight size={18} />
              </button>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
                {lightboxIdx + 1} / {trade.screenshots.length}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

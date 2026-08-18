'use client';

import { useState } from 'react';
import { Trade } from '@/lib/types';
import { EMOTION_OPTIONS, getRMultiple } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { format } from 'date-fns';
import { Edit2, TrendingUp, TrendingDown, Minus, Eye, Zap, RefreshCw, MessageSquare, Star, FlaskConical, X, ChevronLeft, ChevronRight } from 'lucide-react';
import MarketTypeBadge from './MarketTypeBadge';

interface Props {
  trade: Trade;
  onEdit: () => void;
}

function MetaSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="lbl b95" style={{ textTransform: 'uppercase', marginBottom: 12 }}>{title}</p>
      {children}
    </div>
  );
}

const NOTE_TEXT: React.CSSProperties = { margin: 0, fontSize: '12.5px', lineHeight: '20px', color: 'var(--text-2, var(--text))' };

const NOTE_ACCENTS = {
  default: 'var(--muted-2)',
  amber: 'var(--amber)',
  purple: 'var(--pink)',
  blue: 'var(--teal)',
  orange: 'var(--red)',
} as const;

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
  const tone = NOTE_ACCENTS[accent];
  return (
    <div className="inset" style={{ position: 'relative', padding: '14px 16px' }}>
      <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: tone }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: tone }}>
        <span style={{ flex: 'none', display: 'inline-flex' }}>{icon}</span>
        <span className="lbl" style={{ color: 'inherit', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

function EmotionChip({ value }: { value: string }) {
  const opt = EMOTION_OPTIONS.find(e => e.value === value);
  if (!opt) return <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>{value}</span>;
  return (
    <span className="chip" style={{ height: 26, fontSize: '11.5px' }}>
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
    c === 'yes' ? 'var(--green)' : c === 'partial' ? 'var(--amber)' : 'var(--red)';

  const bannerTone = trade.isOpen ? 'var(--amber)' : isWin ? 'var(--green)' : 'var(--red)';

  const hasNotes = trade.setupNotes || trade.executionNotes || trade.lessonNotes || trade.reasoning || trade.oneThingNote || (trade.lossHypothesis && isLoss);
  const hasCharts = trade.screenshots && trade.screenshots.length > 0;

  const goLightbox = (dir: 1 | -1) => {
    if (lightboxIdx === null || !hasCharts) return;
    setLightboxIdx((lightboxIdx + dir + trade.screenshots.length) % trade.screenshots.length);
  };

  return (
    <div>
      {/* Result Banner */}
      <div className="card" style={{ padding: '19px 22px 22px', display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <span className="accent" style={{ width: 56, background: bannerTone }} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18 }}>{trade.coin}</span>
            <MarketTypeBadge type={trade.marketType} size="sm" />
            {trade.strategy && (
              <span className="chip" style={{ height: 22, fontSize: '10.5px' }}>{trade.strategy}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            {trade.isOpen ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '13px', color: 'var(--amber)' }}>
                <Minus size={15} /> Open Position
              </span>
            ) : isWin ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 24, color: 'var(--green)' }}>
                <TrendingUp size={18} /> +{trade.actualPnLPercent?.toFixed(2)}%
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 24, color: 'var(--red)' }}>
                <TrendingDown size={18} /> {trade.actualPnLPercent?.toFixed(2)}%
              </span>
            )}
            {!trade.isOpen && trade.actualPnL !== null && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: isWin ? 'var(--green)' : 'var(--red)' }}>
                ({isWin ? '+' : ''}{formatCurrency(trade.actualPnL ?? 0)})
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 12, fontSize: '11px', color: 'var(--muted-2)' }}>
            <span>Entry: {format(new Date(trade.entryDate), 'MMM d, yyyy')}</span>
            {trade.exitDate && !trade.isOpen && (
              <span>Exit: {format(new Date(trade.exitDate), 'MMM d, yyyy')}</span>
            )}
          </div>
        </div>
        <button onClick={onEdit} className="btn-g" style={{ height: 32, padding: '0 14px', fontSize: 12, flex: 'none' }}>
          <Edit2 size={12} /> Edit
        </button>
      </div>

      {/* Chart Screenshots */}
      {hasCharts && (
        <div style={{ marginTop: 24 }}>
          <p className="lbl b95" style={{ textTransform: 'uppercase', marginBottom: 12 }}>Chart Analysis</p>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: trade.screenshots.length === 1 ? '1fr' : 'repeat(auto-fit,minmax(220px,1fr))' }}>
            {trade.screenshots.map((src, i) => (
              <button
                key={i}
                onClick={() => setLightboxIdx(i)}
                className="relative group overflow-hidden aspect-video"
                style={{ border: '1px solid var(--line)', borderRadius: 2, background: 'var(--panel-2)' }}
              >
                <img
                  src={src}
                  alt={`Chart ${i + 1}`}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ fontWeight: 700, fontSize: 11, color: '#fff', background: 'rgba(0,0,0,.6)', padding: '4px 10px', borderRadius: 2 }}>
                    View full
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Key numbers */}
      <div className="stats" style={{ marginTop: 24 }}>
        {[
          { label: 'Entry', value: formatPrice(trade.entryPrice) },
          { label: 'Exit', value: trade.isOpen ? 'Open' : trade.exitPrice ? formatPrice(trade.exitPrice) : '—' },
          { label: 'P&L $', value: trade.isOpen ? '—' : formatCurrency(trade.actualPnL ?? 0), colored: !trade.isOpen },
          { label: 'R-Multiple', value: rMultiple !== null ? `${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(2)}R` : '—', colored: rMultiple !== null },
        ].map(({ label, value, colored }) => (
          <div key={label} className="inset" style={{ padding: '13px 16px' }}>
            <p className="lbl" style={{ textTransform: 'uppercase' }}>{label}</p>
            <p style={{
              margin: '8px 0 0', fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 15,
              color: colored ? (parseFloat(value) >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text)',
            }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, marginTop: 26 }}>
        {/* Left column — meta */}
        <div style={{ display: 'grid', gap: 24, alignContent: 'start' }}>
          {(trade.emotion || trade.exitEmotion) && (
            <MetaSection title="Emotions">
              <div style={{ display: 'grid', gap: 8 }}>
                {trade.emotion && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 34, flex: 'none', fontSize: '11px', color: 'var(--muted-2)' }}>Entry</span>
                    <EmotionChip value={trade.emotion} />
                  </div>
                )}
                {trade.exitEmotion && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 34, flex: 'none', fontSize: '11px', color: 'var(--muted-2)' }}>Exit</span>
                    <EmotionChip value={trade.exitEmotion} />
                  </div>
                )}
              </div>
            </MetaSection>
          )}

          <MetaSection title="Confidence">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ flex: 1, height: 2, background: 'var(--rail)', display: 'block' }}>
                <i style={{ display: 'block', width: `${(trade.confidence / 10) * 100}%`, height: 2, background: 'var(--amber)' }} />
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: '12.5px' }}>{trade.confidence}/10</span>
            </div>
          </MetaSection>

          {(trade.verdict || trade.selfVerdict) && (
            <MetaSection title="Verdict">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {trade.verdict && (
                  <span className="chip" style={{ height: 26, fontSize: '11px' }}>Journal: {trade.verdict}</span>
                )}
                {trade.selfVerdict && (
                  <span className="chip" style={{ height: 26, fontSize: '11px' }}>You: {trade.selfVerdict}</span>
                )}
              </div>
            </MetaSection>
          )}

          {trade.tags && trade.tags.length > 0 && (
            <MetaSection title="Tags">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {trade.tags.map(tag => (
                  <span key={tag} className="chip" style={{ height: 22, padding: '0 10px', fontSize: '10px' }}>{tag}</span>
                ))}
              </div>
            </MetaSection>
          )}

          {trade.ruleChecklist && trade.ruleChecklist.length > 0 && (
            <MetaSection title="Rules">
              <div>
                {trade.ruleChecklist.map((r, i) => (
                  <div key={i} className="mrow" style={{ alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ flex: 'none', fontFamily: 'var(--mono)', fontWeight: 700, color: complianceColor(r.compliance) }}>
                      {complianceIcon(r.compliance)}
                    </span>
                    <span style={{ color: r.compliance === 'no' ? 'var(--text)' : 'var(--muted)' }}>{r.rule}</span>
                  </div>
                ))}
              </div>
            </MetaSection>
          )}
        </div>

        {/* Right column — note cards */}
        {hasNotes && (
          <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
            {trade.setupNotes && (
              <NoteCard icon={<Eye size={13} />} label="What I Saw" accent="blue">
                <p style={NOTE_TEXT}>{trade.setupNotes}</p>
              </NoteCard>
            )}

            {trade.executionNotes && (
              <NoteCard icon={<Zap size={13} />} label="What I Did" accent="purple">
                <p style={NOTE_TEXT}>{trade.executionNotes}</p>
              </NoteCard>
            )}

            {trade.lessonNotes && (
              <NoteCard icon={<RefreshCw size={13} />} label="What I'd Change" accent="amber">
                <p style={NOTE_TEXT}>{trade.lessonNotes}</p>
              </NoteCard>
            )}

            {trade.reasoning && (
              <NoteCard icon={<MessageSquare size={13} />} label="Why I Entered" accent="default">
                <p style={NOTE_TEXT}>{trade.reasoning}</p>
              </NoteCard>
            )}

            {trade.oneThingNote && (
              <NoteCard icon={<Star size={13} />} label="One Thing" accent="purple">
                <p style={{ ...NOTE_TEXT, fontStyle: 'italic' }}>
                  &ldquo;{trade.oneThingNote}&rdquo;
                </p>
              </NoteCard>
            )}

            {trade.lossHypothesis && isLoss && (
              <NoteCard icon={<FlaskConical size={13} />} label="Loss Hypothesis" accent="orange">
                <p style={NOTE_TEXT}>{trade.lossHypothesis}</p>
              </NoteCard>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && hasCharts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(4,7,11,.94)' }}
          onClick={() => setLightboxIdx(null)}
        >
          <img
            src={trade.screenshots[lightboxIdx]}
            alt={`Chart ${lightboxIdx + 1}`}
            className="max-w-[92vw] max-h-[88vh] object-contain"
            style={{ border: '1px solid var(--line)', borderRadius: 2 }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxIdx(null)}
            className="chip absolute top-4 right-4"
            style={{ width: 36, height: 36, padding: 0, justifyContent: 'center' }}
          >
            <X size={16} />
          </button>
          {trade.screenshots.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); goLightbox(-1); }}
                className="chip absolute left-4 top-1/2 -translate-y-1/2"
                style={{ width: 36, height: 36, padding: 0, justifyContent: 'center' }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); goLightbox(1); }}
                className="chip absolute right-16 top-1/2 -translate-y-1/2"
                style={{ width: 36, height: 36, padding: 0, justifyContent: 'center' }}
              >
                <ChevronRight size={16} />
              </button>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2"
                style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                {lightboxIdx + 1} / {trade.screenshots.length}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';

type Impact = 'high' | 'medium' | 'low';

interface EconomicEvent {
  id: string;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:mm (24h, local server)
  country: string;
  flag: string;
  currency: string;
  title: string;
  impact: Impact;
  forecast?: string;
  previous?: string;
  actual?: string;
}

// Sample / placeholder feed — swap for a real provider (ForexFactory, Trading Economics, etc.) later.
const SAMPLE_EVENTS: EconomicEvent[] = [
  { id: '1', date: today(0), time: '08:30', country: 'United States', flag: '🇺🇸', currency: 'USD', title: 'Non-Farm Payrolls', impact: 'high', forecast: '180K', previous: '227K' },
  { id: '2', date: today(0), time: '08:30', country: 'United States', flag: '🇺🇸', currency: 'USD', title: 'Unemployment Rate',  impact: 'high', forecast: '4.2%', previous: '4.2%' },
  { id: '3', date: today(0), time: '14:00', country: 'United States', flag: '🇺🇸', currency: 'USD', title: 'Fed Chair Speech',    impact: 'high' },
  { id: '4', date: today(1), time: '02:00', country: 'Germany',       flag: '🇩🇪', currency: 'EUR', title: 'CPI m/m',             impact: 'medium', forecast: '0.3%', previous: '0.4%' },
  { id: '5', date: today(1), time: '04:30', country: 'United Kingdom',flag: '🇬🇧', currency: 'GBP', title: 'GDP q/q',             impact: 'high', forecast: '0.1%', previous: '0.5%' },
  { id: '6', date: today(1), time: '10:00', country: 'Eurozone',      flag: '🇪🇺', currency: 'EUR', title: 'ECB Rate Decision',   impact: 'high', forecast: '3.25%', previous: '3.50%' },
  { id: '7', date: today(2), time: '07:30', country: 'Canada',        flag: '🇨🇦', currency: 'CAD', title: 'Employment Change',   impact: 'high', forecast: '25K', previous: '50.5K' },
  { id: '8', date: today(2), time: '21:30', country: 'Australia',     flag: '🇦🇺', currency: 'AUD', title: 'RBA Cash Rate',       impact: 'high', forecast: '4.10%', previous: '4.35%' },
  { id: '9', date: today(3), time: '00:30', country: 'Japan',         flag: '🇯🇵', currency: 'JPY', title: 'Tokyo Core CPI y/y',  impact: 'medium', forecast: '2.0%', previous: '2.2%' },
  { id: '10',date: today(3), time: '08:30', country: 'United States', flag: '🇺🇸', currency: 'USD', title: 'Core PCE m/m',         impact: 'high', forecast: '0.2%', previous: '0.3%' },
  { id: '11',date: today(4), time: '04:00', country: 'Switzerland',   flag: '🇨🇭', currency: 'CHF', title: 'SNB Rate Decision',   impact: 'high', forecast: '0.50%', previous: '1.00%' },
  { id: '12',date: today(4), time: '14:00', country: 'United States', flag: '🇺🇸', currency: 'USD', title: 'Crude Oil Inventories', impact: 'medium', forecast: '-1.2M', previous: '0.8M' },
];

function today(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (iso === today.toISOString().slice(0, 10)) return 'Today';
  if (iso === tomorrow.toISOString().slice(0, 10)) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

const IMPACT_META: Record<Impact, { label: string; dot: string; pill: string }> = {
  high:   { label: 'High',   dot: 'bg-red-500',    pill: 'bg-red-500/15 text-red-400' },
  medium: { label: 'Medium', dot: 'bg-amber-500',  pill: 'bg-amber-500/15 text-amber-400' },
  low:    { label: 'Low',    dot: 'bg-slate-500',  pill: 'bg-slate-500/15 text-slate-400' },
};

// Presentation-only: ATLAS accent colours per impact level.
const IMPACT_ACCENT: Record<Impact, string> = {
  high:   'var(--red)',
  medium: 'var(--amber)',
  low:    'var(--muted-2)',
};

const ALL_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'NZD'];

export default function EconomicCalendar() {
  const [impactFilter, setImpactFilter] = useState<Impact | 'all'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string | 'all'>('all');

  const filtered = useMemo(() => {
    return SAMPLE_EVENTS.filter(e => {
      if (impactFilter !== 'all' && e.impact !== impactFilter) return false;
      if (currencyFilter !== 'all' && e.currency !== currencyFilter) return false;
      return true;
    });
  }, [impactFilter, currencyFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, EconomicEvent[]>();
    for (const ev of filtered) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Hero */}
      <div className="phead">
        <p className="eyebrow">Live macro feed</p>
        <h2>Economic calendar</h2>
        <p className="sub">
          Stay ahead of high-impact news that moves markets. Filter by currency, impact, and date.
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '25px 28px 30px' }}>
        <div className="filters">
          <div>
            <div className="hd">
              <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-hidden="true">
                <path d="M0 6 L3 6 L5 0 L8 11 L11 4 L13 6 L16 6" stroke="#d99405" strokeWidth="1.3" />
              </svg>
              IMPACT
            </div>
            <div className="grp">
              <FilterPill active={impactFilter === 'all'} onClick={() => setImpactFilter('all')}>All</FilterPill>
              {(['high', 'medium', 'low'] as Impact[]).map(i => (
                <FilterPill key={i} active={impactFilter === i} onClick={() => setImpactFilter(i)}>
                  <i style={{ background: IMPACT_ACCENT[i] }} />
                  {IMPACT_META[i].label}
                </FilterPill>
              ))}
            </div>
          </div>

          <div>
            <div className="hd">
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="7.8" stroke="#d99405" strokeWidth="1.3" />
                <path d="M8.5 4v9M6 6.5h5M6 10.5h5" stroke="#d99405" strokeWidth="1.3" />
              </svg>
              CURRENCY
            </div>
            <div className="grp">
              <FilterPill active={currencyFilter === 'all'} onClick={() => setCurrencyFilter('all')}>All</FilterPill>
              {ALL_CURRENCIES.map(c => (
                <FilterPill key={c} active={currencyFilter === c} onClick={() => setCurrencyFilter(c)}>
                  {c}
                </FilterPill>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Events grouped by day */}
      {grouped.length === 0 ? (
        <div className="card" style={{ marginTop: 34 }}>
          <p className="empty-line">No events match your filters</p>
        </div>
      ) : (
        <div>
          {grouped.map(([date, events]) => (
            <div key={date} className="daygroup">
              <div className="dh">
                <b style={{ textTransform: 'uppercase' }}>{formatDay(date)}</b>
                <span>{new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                <em>{events.length} event{events.length === 1 ? '' : 's'}</em>
              </div>

              {events.map(ev => {
                const m = IMPACT_META[ev.impact];
                const col = IMPACT_ACCENT[ev.impact];
                return (
                  <div key={ev.id} className="ev" style={{ borderLeftColor: col }}>
                    <span className="t">{ev.time}</span>
                    <span className="evwho">
                      <span className="cc">{ev.flag}</span>
                      <span className="cur">{ev.currency}</span>
                      <span className="imp" style={{ color: col, textTransform: 'uppercase' }}>
                        <svg width="10" height="9" viewBox="0 0 10 9" fill="none" aria-hidden="true">
                          <path d="M5 0 L10 9 H0 Z" fill="currentColor" />
                        </svg>
                        {m.label}
                      </span>
                    </span>
                    <span className="col">
                      <b>FORECAST</b>
                      <em className={ev.forecast ? undefined : 'dash'}>{ev.forecast ?? '—'}</em>
                    </span>
                    <span className="col">
                      <b>PREVIOUS</b>
                      <em className={ev.previous ? undefined : 'dash'}>{ev.previous ?? '—'}</em>
                    </span>
                    <span className="col">
                      <b>ACTUAL</b>
                      <em className={ev.actual ? undefined : 'dash'}>{ev.actual ?? '—'}</em>
                    </span>
                    <span className="name">{ev.title}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <p className="footnote">
        Sample data — live feed (ForexFactory / Trading Economics) integration coming soon.
      </p>
    </div>
  );
}

function FilterPill({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={active ? 'chip on' : 'chip'}>
      {children}
    </button>
  );
}

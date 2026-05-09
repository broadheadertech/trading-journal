'use client';

import { useState, useMemo } from 'react';
import { CalendarClock, Filter, AlertTriangle, Globe2 } from 'lucide-react';

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
    <div className="relative space-y-8">
      <div className="hero-glow" />

      {/* Hero */}
      <header className="space-y-3 anim-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-[var(--muted-foreground)]">
          <CalendarClock size={12} /> Live macro feed
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
          Economic <span className="gradient-text">calendar</span>
        </h1>
        <p className="text-base text-[var(--muted-foreground)] max-w-xl">
          Stay ahead of high-impact news that moves markets. Filter by currency, impact, and date.
        </p>
      </header>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">
          <Filter size={12} /> Impact
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterPill active={impactFilter === 'all'} onClick={() => setImpactFilter('all')}>All</FilterPill>
          {(['high', 'medium', 'low'] as Impact[]).map(i => (
            <FilterPill key={i} active={impactFilter === i} onClick={() => setImpactFilter(i)}>
              <span className={`w-1.5 h-1.5 rounded-full ${IMPACT_META[i].dot}`} />
              {IMPACT_META[i].label}
            </FilterPill>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--muted-foreground)] font-semibold pt-2">
          <Globe2 size={12} /> Currency
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterPill active={currencyFilter === 'all'} onClick={() => setCurrencyFilter('all')}>All</FilterPill>
          {ALL_CURRENCIES.map(c => (
            <FilterPill key={c} active={currencyFilter === c} onClick={() => setCurrencyFilter(c)}>
              {c}
            </FilterPill>
          ))}
        </div>
      </div>

      {/* Events grouped by day */}
      {grouped.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center">
          <CalendarClock size={32} className="mx-auto text-[var(--muted-foreground)] mb-3" />
          <p className="text-[var(--foreground)] font-medium">No events match your filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, events], gi) => (
            <div key={date} style={{ animationDelay: `${gi * 60}ms` }} className="anim-fade-up space-y-2">
              <div className="flex items-center gap-2 px-1">
                <h3 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">{formatDay(date)}</h3>
                <span className="text-xs text-[var(--muted-foreground)]">{new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-xs text-[var(--muted-foreground)]">{events.length} event{events.length === 1 ? '' : 's'}</span>
              </div>

              <div className="glass rounded-2xl divide-y divide-[var(--border)] overflow-hidden">
                {events.map(ev => {
                  const m = IMPACT_META[ev.impact];
                  return (
                    <div key={ev.id} className="grid grid-cols-[64px_1fr_auto] sm:grid-cols-[64px_1fr_auto_auto_auto] items-center gap-3 p-4 hover:bg-[var(--muted)]/30 transition-colors">
                      {/* Time */}
                      <div className="text-sm font-mono font-semibold text-[var(--foreground)]">{ev.time}</div>

                      {/* Title + country */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base">{ev.flag}</span>
                          <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-[var(--muted)]/40 text-[var(--muted-foreground)]">{ev.currency}</span>
                          <span className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${m.pill}`}>
                            {ev.impact === 'high' && <AlertTriangle size={10} />}
                            {m.label}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-[var(--foreground)] truncate mt-1">{ev.title}</div>
                      </div>

                      {/* Forecast/previous/actual on wide screens */}
                      <div className="hidden sm:block text-right">
                        <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Forecast</div>
                        <div className="text-sm font-semibold text-[var(--foreground)]">{ev.forecast ?? '—'}</div>
                      </div>
                      <div className="hidden sm:block text-right">
                        <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Previous</div>
                        <div className="text-sm font-semibold text-[var(--foreground)]">{ev.previous ?? '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Actual</div>
                        <div className={`text-sm font-bold ${ev.actual ? 'text-emerald-400' : 'text-[var(--muted-foreground)]'}`}>{ev.actual ?? '—'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--muted-foreground)] text-center">
        Sample data — live feed (ForexFactory / Trading Economics) integration coming soon.
      </p>
    </div>
  );
}

function FilterPill({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? 'bg-gradient-to-br from-pink-500 to-pink-700 text-white shadow shadow-teal-500/30'
          : 'bg-[var(--muted)]/40 text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
      }`}
    >
      {children}
    </button>
  );
}

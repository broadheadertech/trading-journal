'use client';

import { useState, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup,
} from 'react-simple-maps';
import { geoCentroid } from 'd3-geo';
import { Layers, Search, ZoomIn, ZoomOut, RotateCcw, TrendingUp, Building2, Banknote, Anchor, Cable, Pipette, Coins, DollarSign, Type } from 'lucide-react';

// Continent groupings for country names (ISO numeric codes used by world-atlas)
const CONTINENT_BY_ISO: Record<string, string> = {
  // Africa
  '012':'AF','024':'AF','072':'AF','108':'AF','120':'AF','132':'AF','140':'AF','148':'AF','174':'AF','178':'AF','180':'AF','204':'AF','226':'AF','231':'AF','232':'AF','262':'AF','266':'AF','270':'AF','288':'AF','324':'AF','384':'AF','404':'AF','426':'AF','430':'AF','434':'AF','450':'AF','454':'AF','466':'AF','478':'AF','480':'AF','504':'AF','508':'AF','516':'AF','562':'AF','566':'AF','646':'AF','686':'AF','690':'AF','694':'AF','706':'AF','710':'AF','716':'AF','729':'AF','728':'AF','768':'AF','788':'AF','800':'AF','818':'AF','834':'AF','854':'AF','894':'AF',
  // Americas
  '028':'NA','032':'SA','044':'NA','052':'NA','068':'SA','076':'SA','084':'NA','124':'NA','152':'SA','170':'SA','188':'NA','192':'NA','212':'NA','214':'NA','218':'SA','222':'NA','238':'SA','254':'SA','304':'NA','308':'NA','312':'NA','320':'NA','328':'SA','332':'NA','340':'NA','388':'NA','474':'NA','484':'NA','500':'NA','531':'NA','533':'NA','534':'NA','535':'NA','558':'NA','591':'NA','600':'SA','604':'SA','630':'NA','659':'NA','662':'NA','666':'NA','670':'NA','740':'SA','780':'NA','796':'NA','840':'NA','850':'NA','858':'SA','862':'SA',
  // Asia
  '004':'AS','031':'AS','036':'OC','048':'AS','050':'AS','051':'AS','064':'AS','086':'AS','090':'OC','096':'AS','104':'AS','116':'AS','144':'AS','156':'AS','158':'AS','196':'AS','242':'OC','258':'OC','268':'AS','275':'AS','296':'OC','316':'OC','344':'AS','356':'AS','360':'AS','364':'AS','368':'AS','376':'AS','392':'AS','398':'AS','400':'AS','408':'AS','410':'AS','414':'AS','417':'AS','418':'AS','422':'AS','446':'AS','458':'AS','462':'AS','496':'AS','512':'AS','520':'OC','524':'AS','540':'OC','548':'OC','554':'OC','570':'OC','580':'OC','583':'OC','584':'OC','585':'OC','586':'AS','598':'OC','608':'AS','612':'OC','626':'AS','634':'AS','682':'AS','702':'AS','704':'AS','744':'AS','760':'AS','762':'AS','764':'AS','772':'OC','776':'OC','784':'AS','798':'OC','860':'AS','872':'OC','876':'OC','882':'OC','887':'AS',
  // Europe
  '008':'EU','020':'EU','040':'EU','056':'EU','070':'EU','100':'EU','112':'EU','191':'EU','203':'EU','208':'EU','233':'EU','246':'EU','250':'EU','276':'EU','292':'EU','300':'EU','336':'EU','348':'EU','352':'EU','372':'EU','380':'EU','428':'EU','438':'EU','440':'EU','442':'EU','470':'EU','492':'EU','498':'EU','499':'EU','528':'EU','578':'EU','616':'EU','620':'EU','642':'EU','643':'EU','674':'EU','688':'EU','703':'EU','705':'EU','724':'EU','752':'EU','756':'EU','804':'EU','807':'EU','826':'EU',
  // Antarctica
  '010':'AN',
};

const CONTINENTS: { id: string; label: string; emoji: string }[] = [
  { id: 'AF', label: 'Africa',        emoji: '🌍' },
  { id: 'EU', label: 'Europe',        emoji: '🌍' },
  { id: 'AS', label: 'Asia',          emoji: '🌏' },
  { id: 'NA', label: 'N. America',    emoji: '🌎' },
  { id: 'SA', label: 'S. America',    emoji: '🌎' },
  { id: 'OC', label: 'Oceania',       emoji: '🌏' },
  { id: 'AN', label: 'Antarctica',    emoji: '🧊' },
];

// Public world atlas (110m resolution — small + fast)
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ─── Layer definitions ──────────────────────────────────────────────
type LayerId =
  | 'stockExchanges' | 'financialCenters' | 'centralBanks' | 'commodityHubs'
  | 'gccInvestments' | 'tradeRoutes' | 'underseaCables' | 'pipelines';

interface LayerDef {
  id: LayerId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  color: string;
  defaultOn: boolean;
}

const LAYERS: LayerDef[] = [
  { id: 'stockExchanges',   label: 'Stock Exchanges',    icon: TrendingUp, color: '#10b981', defaultOn: true },
  { id: 'financialCenters', label: 'Financial Centers',  icon: Building2,  color: '#f59e0b', defaultOn: true },
  { id: 'centralBanks',     label: 'Central Banks',      icon: Banknote,   color: '#3b82f6', defaultOn: true },
  { id: 'commodityHubs',    label: 'Commodity Hubs',     icon: Coins,      color: '#a855f7', defaultOn: false },
  { id: 'gccInvestments',   label: 'GCC Investments',    icon: DollarSign, color: '#ec4899', defaultOn: false },
  { id: 'tradeRoutes',      label: 'Trade Routes',       icon: Anchor,     color: '#06b6d4', defaultOn: true },
  { id: 'underseaCables',   label: 'Undersea Cables',    icon: Cable,      color: '#22d3ee', defaultOn: true },
  { id: 'pipelines',        label: 'Pipelines',          icon: Pipette,    color: '#fb923c', defaultOn: true },
];

// ─── Marker data ────────────────────────────────────────────────────
interface PointMarker { name: string; coords: [number, number]; layer: LayerId }

const POINTS: PointMarker[] = [
  // Stock Exchanges
  { name: 'NYSE',         coords: [-74.0,   40.7],  layer: 'stockExchanges' },
  { name: 'NASDAQ',       coords: [-73.9,   40.8],  layer: 'stockExchanges' },
  { name: 'LSE',          coords: [-0.09,   51.51], layer: 'stockExchanges' },
  { name: 'TSE',          coords: [139.77,  35.68], layer: 'stockExchanges' },
  { name: 'SSE',          coords: [121.47,  31.23], layer: 'stockExchanges' },
  { name: 'HKEX',         coords: [114.16,  22.28], layer: 'stockExchanges' },
  { name: 'Euronext',     coords: [2.35,    48.86], layer: 'stockExchanges' },
  { name: 'BSE',          coords: [72.83,   18.93], layer: 'stockExchanges' },
  { name: 'ASX',          coords: [151.21, -33.87], layer: 'stockExchanges' },
  { name: 'TSX',          coords: [-79.38,  43.65], layer: 'stockExchanges' },
  { name: 'B3',           coords: [-46.63, -23.55], layer: 'stockExchanges' },
  { name: 'JSE',          coords: [28.04,  -26.20], layer: 'stockExchanges' },
  { name: 'SGX',          coords: [103.85,   1.29], layer: 'stockExchanges' },
  { name: 'KRX',          coords: [126.99,  37.55], layer: 'stockExchanges' },
  { name: 'DFM',          coords: [55.27,   25.20], layer: 'stockExchanges' },

  // Financial Centers
  { name: 'New York',     coords: [-74.0,   40.7],  layer: 'financialCenters' },
  { name: 'London',       coords: [-0.13,   51.51], layer: 'financialCenters' },
  { name: 'Singapore',    coords: [103.85,   1.29], layer: 'financialCenters' },
  { name: 'Hong Kong',    coords: [114.16,  22.28], layer: 'financialCenters' },
  { name: 'Zurich',       coords: [8.54,    47.37], layer: 'financialCenters' },
  { name: 'Frankfurt',    coords: [8.68,    50.11], layer: 'financialCenters' },
  { name: 'Tokyo',        coords: [139.77,  35.68], layer: 'financialCenters' },
  { name: 'Dubai',        coords: [55.27,   25.20], layer: 'financialCenters' },
  { name: 'Shanghai',     coords: [121.47,  31.23], layer: 'financialCenters' },
  { name: 'Toronto',      coords: [-79.38,  43.65], layer: 'financialCenters' },

  // Central Banks
  { name: 'Federal Reserve',  coords: [-77.04, 38.89], layer: 'centralBanks' },
  { name: 'ECB',              coords: [8.68,   50.11], layer: 'centralBanks' },
  { name: 'Bank of England',  coords: [-0.09,  51.51], layer: 'centralBanks' },
  { name: 'BoJ',              coords: [139.77, 35.68], layer: 'centralBanks' },
  { name: 'PBoC',             coords: [116.40, 39.90], layer: 'centralBanks' },
  { name: 'SNB',              coords: [7.45,   46.95], layer: 'centralBanks' },
  { name: 'RBA',              coords: [149.13,-35.30], layer: 'centralBanks' },
  { name: 'BoC',              coords: [-75.70, 45.42], layer: 'centralBanks' },
  { name: 'RBI',              coords: [72.83,  18.93], layer: 'centralBanks' },
  { name: 'CBR',              coords: [37.62,  55.75], layer: 'centralBanks' },
  { name: 'BCB',              coords: [-47.93,-15.79], layer: 'centralBanks' },

  // Commodity Hubs
  { name: 'Houston',      coords: [-95.37,  29.76], layer: 'commodityHubs' },
  { name: 'Rotterdam',    coords: [4.48,    51.92], layer: 'commodityHubs' },
  { name: 'Singapore Oil',coords: [103.85,   1.29], layer: 'commodityHubs' },
  { name: 'Riyadh',       coords: [46.67,   24.71], layer: 'commodityHubs' },
  { name: 'Chicago CME',  coords: [-87.63,  41.88], layer: 'commodityHubs' },
  { name: 'LME (London)', coords: [-0.09,   51.51], layer: 'commodityHubs' },

  // GCC Investments (sovereign wealth flow targets)
  { name: 'PIF (Riyadh)', coords: [46.67,   24.71], layer: 'gccInvestments' },
  { name: 'ADIA (Abu Dhabi)', coords: [54.37, 24.45], layer: 'gccInvestments' },
  { name: 'QIA (Doha)',   coords: [51.53,   25.28], layer: 'gccInvestments' },
  { name: 'KIA (Kuwait)', coords: [47.98,   29.38], layer: 'gccInvestments' },
];

// ─── Line data (great-circle routes auto-curve in d3-geo) ──────────
interface LineEdge { from: [number, number]; to: [number, number]; layer: LayerId }

const LINES: LineEdge[] = [
  // Major trade routes
  { from: [-74.0, 40.7],  to: [-0.13, 51.51], layer: 'tradeRoutes' },         // NY-London
  { from: [103.85, 1.29], to: [-95.37, 29.76], layer: 'tradeRoutes' },        // SG-Houston
  { from: [114.16, 22.28], to: [-122.42, 37.77], layer: 'tradeRoutes' },      // HK-SF
  { from: [4.48, 51.92], to: [103.85, 1.29], layer: 'tradeRoutes' },          // Rotterdam-SG
  { from: [121.47, 31.23], to: [4.48, 51.92], layer: 'tradeRoutes' },         // Shanghai-Rotterdam
  { from: [55.27, 25.20], to: [-0.13, 51.51], layer: 'tradeRoutes' },         // Dubai-London
  { from: [-43.20, -22.91], to: [-0.13, 51.51], layer: 'tradeRoutes' },       // Rio-London
  { from: [139.77, 35.68], to: [-122.42, 37.77], layer: 'tradeRoutes' },      // Tokyo-SF

  // Undersea cables (Atlantic + Pacific + Indian Ocean spine)
  { from: [-74.0, 40.7],  to: [-9.14, 38.72], layer: 'underseaCables' },      // NY-Lisbon (MAREA)
  { from: [-74.0, 40.7],  to: [-0.13, 51.51], layer: 'underseaCables' },      // NY-London
  { from: [-122.42, 37.77], to: [139.77, 35.68], layer: 'underseaCables' },   // SF-Tokyo
  { from: [-118.24, 34.05], to: [151.21, -33.87], layer: 'underseaCables' },  // LA-Sydney (Southern Cross)
  { from: [103.85, 1.29], to: [55.27, 25.20], layer: 'underseaCables' },      // SG-Dubai (SEA-ME-WE)
  { from: [55.27, 25.20], to: [4.48, 51.92], layer: 'underseaCables' },       // Dubai-Rotterdam
  { from: [114.16, 22.28], to: [103.85, 1.29], layer: 'underseaCables' },     // HK-SG
  { from: [103.85, 1.29], to: [151.21, -33.87], layer: 'underseaCables' },    // SG-Sydney

  // Pipelines (oil + gas major)
  { from: [37.62, 55.75], to: [13.40, 52.52], layer: 'pipelines' },           // Russia-Germany (Nord Stream)
  { from: [54.37, 24.45], to: [104.06, 30.67], layer: 'pipelines' },          // UAE-China LNG
  { from: [-95.37, 29.76], to: [-101.69, 21.12], layer: 'pipelines' },        // Houston-Mexico
  { from: [46.67, 24.71], to: [55.27, 25.20], layer: 'pipelines' },           // Saudi-UAE
  { from: [37.62, 55.75], to: [80.07, 30.31], layer: 'pipelines' },           // Russia-China gas (Power of Siberia)
];

function CountryLabel({ geo, name, zoom }: { geo: any; name: string; zoom: number }) {
  const c = geoCentroid(geo) as [number, number];
  if (!c || !isFinite(c[0]) || !isFinite(c[1])) return null;
  const fontSize = Math.max(2.4, 6 / Math.max(1, zoom * 0.55));
  return (
    <Marker coordinates={c}>
      <text
        textAnchor="middle"
        y={0}
        fontSize={fontSize}
        fill="#cbd5e1"
        stroke="#000"
        strokeWidth={fontSize * 0.05}
        paintOrder="stroke"
        style={{ pointerEvents: 'none', fontWeight: 600 }}
      >
        {name}
      </text>
    </Marker>
  );
}

export default function WorldMap() {
  const [active, setActive] = useState<Set<LayerId>>(
    () => new Set(LAYERS.filter(l => l.defaultOn).map(l => l.id))
  );
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([10, 20]);
  const [showCountryNames, setShowCountryNames] = useState(true);
  const [activeContinents, setActiveContinents] = useState<Set<string>>(
    () => new Set(CONTINENTS.map(c => c.id))
  );

  const toggleContinent = (id: string) => {
    setActiveContinents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const visibleLayers = LAYERS.filter(l =>
    !search.trim() || l.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: LayerId) => {
    setActive(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const visiblePoints = useMemo(
    () => POINTS.filter(p => active.has(p.layer)),
    [active]
  );
  const visibleLines = useMemo(
    () => LINES.filter(l => active.has(l.layer)),
    [active]
  );

  const colorFor = (id: LayerId) => LAYERS.find(l => l.id === id)?.color ?? '#fff';

  const reset = () => { setZoom(1); setCenter([10, 20]); };

  return (
    <div className="glass rounded-3xl overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-0 min-h-[600px]">
        {/* ── Layers panel ── */}
        <aside className="p-4 border-b lg:border-b-0 lg:border-r border-[var(--border)] space-y-3 bg-[var(--background)]/30">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            <Layers size={12} /> Layers
          </div>

          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search layers…"
              className="w-full pl-7 pr-2 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs"
            />
          </div>

          {/* Continents */}
          <div className="pt-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">Continents</div>
            <div className="flex flex-wrap gap-1">
              {CONTINENTS.map(c => {
                const on = activeContinents.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleContinent(c.id)}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider transition-colors ${
                      on ? 'bg-teal-500/20 text-teal-400' : 'bg-[var(--muted)]/30 text-[var(--muted-foreground)]/50'
                    }`}
                  >
                    {c.emoji} {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Country labels toggle */}
          <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[var(--muted)]/40 transition-colors">
            <div
              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                showCountryNames ? 'border-transparent bg-teal-400' : 'border-[var(--muted-foreground)]/40'
              }`}
            >
              {showCountryNames && <span className="text-white text-[10px] font-black">✓</span>}
            </div>
            <Type size={12} className="text-teal-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground)]">Country names</span>
            <input type="checkbox" checked={showCountryNames} onChange={() => setShowCountryNames(s => !s)} className="hidden" />
          </label>

          <div className="space-y-1 pt-2 border-t border-[var(--border)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">Data Layers</div>
            {visibleLayers.map(l => {
              const Icon = l.icon;
              const on = active.has(l.id);
              return (
                <label
                  key={l.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[var(--muted)]/40 transition-colors"
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      on ? 'border-transparent' : 'border-[var(--muted-foreground)]/40'
                    }`}
                    style={{ background: on ? l.color : 'transparent' }}
                  >
                    {on && <span className="text-white text-[10px] font-black">✓</span>}
                  </div>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(l.id)}
                    className="hidden"
                  />
                  <Icon size={12} style={{ color: l.color }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground)]">{l.label}</span>
                </label>
              );
            })}
          </div>
        </aside>

        {/* ── Map ── */}
        <div className="relative bg-[#0a0f14] min-h-[600px]">
          {/* Zoom controls */}
          <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
            <button
              onClick={() => setZoom(z => Math.min(z + 0.5, 8))}
              className="w-9 h-9 rounded-lg bg-[var(--card)]/90 backdrop-blur border border-[var(--border)] flex items-center justify-center hover:bg-[var(--muted)]/60"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setZoom(z => Math.max(z - 0.5, 1))}
              className="w-9 h-9 rounded-lg bg-[var(--card)]/90 backdrop-blur border border-[var(--border)] flex items-center justify-center hover:bg-[var(--muted)]/60"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={reset}
              className="w-9 h-9 rounded-lg bg-[var(--card)]/90 backdrop-blur border border-[var(--border)] flex items-center justify-center hover:bg-[var(--muted)]/60"
              title="Reset"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Stats overlay */}
          <div className="absolute left-3 bottom-3 z-10 flex flex-wrap gap-1.5">
            {LAYERS.filter(l => active.has(l.id)).map(l => {
              const count = POINTS.filter(p => p.layer === l.id).length + LINES.filter(ln => ln.layer === l.id).length;
              return (
                <span
                  key={l.id}
                  className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full backdrop-blur"
                  style={{ background: l.color + '22', color: l.color }}
                >
                  {l.label} · {count}
                </span>
              );
            })}
          </div>

          <ComposableMap
            projection="geoEqualEarth"
            projectionConfig={{ scale: 160 }}
            width={800}
            height={500}
            style={{ width: '100%', height: '100%' }}
          >
            <ZoomableGroup zoom={zoom} center={center} onMoveEnd={({ coordinates, zoom: z }) => { setCenter(coordinates); setZoom(z); }}>
              <Geographies geography={GEO_URL}>
                {({ geographies }: { geographies: any[] }) =>
                  geographies.map((geo: any) => {
                    const iso = geo.id as string;
                    const continent = CONTINENT_BY_ISO[iso];
                    const inActiveContinent = !continent || activeContinents.has(continent);
                    const name = geo.properties?.name as string | undefined;
                    // Get a label anchor (centroid via projected bbox midpoint)
                    return (
                      <g key={geo.rsmKey}>
                        <Geography
                          geography={geo}
                          fill={inActiveContinent ? '#13202b' : '#0a1015'}
                          stroke="#1c2d3d"
                          strokeWidth={0.4}
                          style={{
                            default: { outline: 'none', opacity: inActiveContinent ? 1 : 0.35 },
                            hover:   { fill: inActiveContinent ? '#1a2c3a' : '#0a1015', outline: 'none' },
                            pressed: { fill: '#1a2c3a', outline: 'none' },
                          }}
                        />
                        {showCountryNames && inActiveContinent && name && zoom >= 1.5 && (
                          <CountryLabel geo={geo} name={name} zoom={zoom} />
                        )}
                      </g>
                    );
                  })
                }
              </Geographies>

              {/* Lines */}
              {visibleLines.map((edge, i) => (
                <Line
                  key={`line-${i}`}
                  from={edge.from}
                  to={edge.to}
                  stroke={colorFor(edge.layer)}
                  strokeWidth={1}
                  strokeOpacity={0.55}
                  strokeLinecap="round"
                />
              ))}

              {/* Markers */}
              {visiblePoints.map((p, i) => (
                <Marker key={`pt-${i}`} coordinates={p.coords}>
                  <circle r={2.5 / Math.max(1, zoom * 0.4)} fill={colorFor(p.layer)} stroke="#000" strokeWidth={0.4} />
                  {zoom > 2 && (
                    <text textAnchor="middle" y={-6} fontSize={6 / Math.max(1, zoom * 0.3)} fill="#fff" stroke="#000" strokeWidth={0.3} paintOrder="stroke">
                      {p.name}
                    </text>
                  )}
                </Marker>
              ))}
            </ZoomableGroup>
          </ComposableMap>
        </div>
      </div>
    </div>
  );
}

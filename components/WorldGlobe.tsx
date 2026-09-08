'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Buildings as Building2, Money as Banknote, TrendUp as TrendingUp, Anchor, CurrencyDollar as DollarSign } from '@phosphor-icons/react';

// Globe component is client-only (touches window/three.js)
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

type LayerId = 'stockExchanges' | 'financialCenters' | 'centralBanks' | 'commodityHubs' | 'gccInvestments' | 'tradeRoutes';

interface PointMarker {
  name: string;
  lat: number;
  lng: number;
  layer: LayerId;
}

interface ArcEdge {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  layer: LayerId;
}

const LAYERS: { id: LayerId; label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'stockExchanges',   label: 'Stock Exchanges',    color: '#d99405', icon: TrendingUp },
  { id: 'financialCenters', label: 'Financial Centers',  color: '#f472b6', icon: Building2 },
  { id: 'centralBanks',     label: 'Central Banks',      color: '#d99405', icon: Banknote },
  { id: 'commodityHubs',    label: 'Commodity Hubs',     color: '#f0a409', icon: Anchor },
  { id: 'gccInvestments',   label: 'GCC Investments',    color: '#a855f7', icon: DollarSign },
  { id: 'tradeRoutes',      label: 'Trade Routes',       color: '#d99405', icon: Anchor },
];

const POINTS: PointMarker[] = [
  // Stock Exchanges
  { name: 'NYSE',     lat: 40.7,   lng: -74.0,   layer: 'stockExchanges' },
  { name: 'NASDAQ',   lat: 40.8,   lng: -73.9,   layer: 'stockExchanges' },
  { name: 'LSE',      lat: 51.51,  lng: -0.09,   layer: 'stockExchanges' },
  { name: 'TSE',      lat: 35.68,  lng: 139.77,  layer: 'stockExchanges' },
  { name: 'SSE',      lat: 31.23,  lng: 121.47,  layer: 'stockExchanges' },
  { name: 'HKEX',     lat: 22.28,  lng: 114.16,  layer: 'stockExchanges' },
  { name: 'Euronext', lat: 48.86,  lng: 2.35,    layer: 'stockExchanges' },
  { name: 'BSE',      lat: 18.93,  lng: 72.83,   layer: 'stockExchanges' },
  { name: 'ASX',      lat: -33.87, lng: 151.21,  layer: 'stockExchanges' },
  { name: 'TSX',      lat: 43.65,  lng: -79.38,  layer: 'stockExchanges' },
  { name: 'B3',       lat: -23.55, lng: -46.63,  layer: 'stockExchanges' },
  { name: 'JSE',      lat: -26.20, lng: 28.04,   layer: 'stockExchanges' },
  { name: 'SGX',      lat: 1.29,   lng: 103.85,  layer: 'stockExchanges' },
  { name: 'KRX',      lat: 37.55,  lng: 126.99,  layer: 'stockExchanges' },
  { name: 'DFM',      lat: 25.20,  lng: 55.27,   layer: 'stockExchanges' },

  // Financial Centers
  { name: 'New York',   lat: 40.7,   lng: -74.0,   layer: 'financialCenters' },
  { name: 'London',     lat: 51.51,  lng: -0.13,   layer: 'financialCenters' },
  { name: 'Singapore',  lat: 1.29,   lng: 103.85,  layer: 'financialCenters' },
  { name: 'Hong Kong',  lat: 22.28,  lng: 114.16,  layer: 'financialCenters' },
  { name: 'Zurich',     lat: 47.37,  lng: 8.54,    layer: 'financialCenters' },
  { name: 'Frankfurt',  lat: 50.11,  lng: 8.68,    layer: 'financialCenters' },
  { name: 'Tokyo',      lat: 35.68,  lng: 139.77,  layer: 'financialCenters' },
  { name: 'Dubai',      lat: 25.20,  lng: 55.27,   layer: 'financialCenters' },
  { name: 'Shanghai',   lat: 31.23,  lng: 121.47,  layer: 'financialCenters' },
  { name: 'Toronto',    lat: 43.65,  lng: -79.38,  layer: 'financialCenters' },

  // Central Banks
  { name: 'Federal Reserve', lat: 38.89,  lng: -77.04, layer: 'centralBanks' },
  { name: 'ECB',             lat: 50.11,  lng: 8.68,   layer: 'centralBanks' },
  { name: 'Bank of England', lat: 51.51,  lng: -0.09,  layer: 'centralBanks' },
  { name: 'BoJ',             lat: 35.68,  lng: 139.77, layer: 'centralBanks' },
  { name: 'PBoC',            lat: 39.90,  lng: 116.40, layer: 'centralBanks' },
  { name: 'SNB',             lat: 46.95,  lng: 7.45,   layer: 'centralBanks' },
  { name: 'RBA',             lat: -35.30, lng: 149.13, layer: 'centralBanks' },
  { name: 'BoC',             lat: 45.42,  lng: -75.70, layer: 'centralBanks' },
  { name: 'RBI',             lat: 18.93,  lng: 72.83,  layer: 'centralBanks' },
  { name: 'CBR',             lat: 55.75,  lng: 37.62,  layer: 'centralBanks' },

  // Commodity Hubs
  { name: 'Houston',       lat: 29.76, lng: -95.37, layer: 'commodityHubs' },
  { name: 'Rotterdam',     lat: 51.92, lng: 4.48,   layer: 'commodityHubs' },
  { name: 'Singapore Oil', lat: 1.29,  lng: 103.85, layer: 'commodityHubs' },
  { name: 'Riyadh',        lat: 24.71, lng: 46.67,  layer: 'commodityHubs' },
  { name: 'Chicago CME',   lat: 41.88, lng: -87.63, layer: 'commodityHubs' },

  // GCC Investments
  { name: 'PIF (Riyadh)',     lat: 24.71, lng: 46.67, layer: 'gccInvestments' },
  { name: 'ADIA (Abu Dhabi)', lat: 24.45, lng: 54.37, layer: 'gccInvestments' },
  { name: 'QIA (Doha)',       lat: 25.28, lng: 51.53, layer: 'gccInvestments' },
  { name: 'KIA (Kuwait)',     lat: 29.38, lng: 47.98, layer: 'gccInvestments' },
];

const ARCS: ArcEdge[] = [
  { startLat: 40.7,   startLng: -74.0,  endLat: 51.51,  endLng: -0.13,   layer: 'tradeRoutes' }, // NY-London
  { startLat: 1.29,   startLng: 103.85, endLat: 29.76,  endLng: -95.37,  layer: 'tradeRoutes' }, // SG-Houston
  { startLat: 22.28,  startLng: 114.16, endLat: 37.77,  endLng: -122.42, layer: 'tradeRoutes' }, // HK-SF
  { startLat: 35.68,  startLng: 139.77, endLat: 40.7,   endLng: -74.0,   layer: 'tradeRoutes' }, // Tokyo-NY
  { startLat: 25.20,  startLng: 55.27,  endLat: 22.28,  endLng: 114.16,  layer: 'tradeRoutes' }, // Dubai-HK
  { startLat: 51.51,  startLng: -0.13,  endLat: 50.11,  endLng: 8.68,    layer: 'tradeRoutes' }, // London-Frankfurt
  { startLat: -33.87, startLng: 151.21, endLat: 1.29,   endLng: 103.85,  layer: 'tradeRoutes' }, // Sydney-SG
  { startLat: 24.71,  startLng: 46.67,  endLat: 51.51,  endLng: -0.13,   layer: 'tradeRoutes' }, // Riyadh-London
];

export default function WorldGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<unknown>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [active, setActive] = useState<Record<LayerId, boolean>>(() => ({
    stockExchanges: true,
    financialCenters: true,
    centralBanks: true,
    commodityHubs: true,
    gccInvestments: false,
    tradeRoutes: true,
  }));

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: Math.max(420, el.clientHeight) });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: Math.max(420, el.clientHeight) });
    return () => ro.disconnect();
  }, []);

  // Auto-rotate on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const g = globeRef.current as { controls?: () => { autoRotate: boolean; autoRotateSpeed: number } } | null;
      if (g && typeof g.controls === 'function') {
        const controls = g.controls();
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.4;
      }
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const visiblePoints = useMemo(() => POINTS.filter(p => active[p.layer]), [active]);
  const visibleArcs = useMemo(() => ARCS.filter(a => active[a.layer]), [active]);

  function toggle(id: LayerId) {
    setActive(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function colorFor(layer: LayerId) {
    return LAYERS.find(l => l.id === layer)?.color ?? '#d99405';
  }

  return (
    <div>
      {/* Layer toggles */}
      <div className="layers" style={{ gap: 10, paddingBottom: 18, borderBottom: '1px solid var(--line)' }}>
        <b style={{ marginRight: 18 }}>LAYERS</b>
        {LAYERS.map(l => {
          const Icon = l.icon;
          const on = active[l.id];
          return (
            <button
              key={l.id}
              onClick={() => toggle(l.id)}
              className="chip"
              style={{
                borderColor: on ? `${l.color}66` : 'var(--line)',
                color: on ? '#c0ccda' : 'var(--muted-4)',
              }}
            >
              <i style={{ background: on ? l.color : 'var(--muted-4)', borderRadius: 1 }} />
              <Icon size={11} />
              {l.label}
            </button>
          );
        })}
      </div>

      {/* Globe canvas */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: 560,
          marginTop: 18,
          border: '1px solid var(--line)',
          borderRadius: 2,
          background: '#05080d',
          overflow: 'hidden',
        }}
      >
        <Globe
          ref={globeRef as never}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png"
          atmosphereColor="#d99405"
          atmosphereAltitude={0.18}
          showGlobe={true}
          pointsData={visiblePoints}
          pointLat={(d: object) => (d as PointMarker).lat}
          pointLng={(d: object) => (d as PointMarker).lng}
          pointColor={(d: object) => colorFor((d as PointMarker).layer)}
          pointAltitude={0.015}
          pointRadius={0.32}
          pointLabel={(d: object) => {
            const p = d as PointMarker;
            const layer = LAYERS.find(l => l.id === p.layer)?.label ?? p.layer;
            return `<div style="background:#0a0f17;padding:9px 13px;border-radius:2px;border:1px solid #182432;font-family:Inter,system-ui,sans-serif;color:#edf2f7;font-size:12px;line-height:1.35"><div style="font-weight:700;font-size:12.5px;color:${colorFor(p.layer)}">${p.name}</div><div style="color:#7f8ea3;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:.04em;margin-top:5px">${layer}</div></div>`;
          }}
          arcsData={visibleArcs}
          arcStartLat={(d: object) => (d as ArcEdge).startLat}
          arcStartLng={(d: object) => (d as ArcEdge).startLng}
          arcEndLat={(d: object) => (d as ArcEdge).endLat}
          arcEndLng={(d: object) => (d as ArcEdge).endLng}
          arcColor={() => ['#d99405', '#d99405']}
          arcStroke={0.4}
          arcAltitudeAutoScale={0.4}
          arcDashLength={0.4}
          arcDashGap={0.15}
          arcDashAnimateTime={2400}
        />

        {/* Legend pill */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            height: 26,
            padding: '0 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            border: '1px solid var(--line)',
            borderRadius: 2,
            background: 'rgba(10,15,23,.9)',
            fontSize: 10.5,
            color: 'var(--muted)',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 1, background: 'var(--green)', flex: 'none' }} />
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{visiblePoints.length}</span> markers
          <span style={{ color: 'var(--muted-3)' }}>·</span>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{visibleArcs.length}</span> routes
          <span style={{ color: 'var(--muted-3)' }}>·</span> drag to rotate
        </div>
      </div>
    </div>
  );
}

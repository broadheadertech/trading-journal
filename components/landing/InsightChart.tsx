'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/* Procedural 3D candlestick chart for the "Trading Insight in Weeks" section.
   Everything is generated from a running price series — no assets, no data
   fetch. The plane is tilted in CSS; the canvas draws in a flat coordinate
   system whose height is fixed at 320 logical units. */

const LOGICAL_H = 320;
const TARGET_SPACING = 18.75; // 900 / 48, the density the design is drawn at
const MIN_CANDLES = 48;
const SCROLL_PX = 0.55;
const LIVE_EDGE = 0.9; // fraction of the width the newest candle sits at
const FRAME_GAP_LIMIT = 200; // skip a frame rather than catching up after a stall

const UP = '#24C88A';
const DOWN = '#F0485E';
const AMBER = '#D99405';
const START_TRADES = 1284;

type Candle = { o: number; h: number; l: number; c: number; up: boolean };

/* Price engine: phase-shifted bias, clustered volatility, occasional spike
   wicks, and no gaps — every open is exactly the previous close. */
function createEngine() {
  let price = 160;
  let n = 0;
  let vol = 1;

  // down, consolidate, recover, run — one full arc across the visible window
  const BIAS = [-1.8, -0.1, 1.2, 2.6];

  return function next(): Candle {
    const bias = BIAS[Math.floor(n / 12) % BIAS.length];
    n += 1;

    // volatility clusters: spike, then decay back toward baseline
    vol = Math.random() > 0.88 ? 2.2 : 1 + (vol - 1) * 0.85;

    const o = price;
    const c = Math.min(280, Math.max(40, o + ((Math.random() - 0.5) * 14 * vol + bias)));

    const top = Math.max(o, c);
    const bottom = Math.min(o, c);
    let h = top + Math.random() * 8;
    let l = bottom - Math.random() * 8;

    // 5% spike / rejection candles
    if (Math.random() < 0.05) {
      if (Math.random() < 0.5) h = top + Math.random() * 8 * 2.4;
      else l = bottom - Math.random() * 8 * 2.4;
    }

    price = c;
    return { o, h, l, c, up: c >= o };
  };
}

export default function InsightChart() {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trades, setTrades] = useState(START_TRADES);
  const [last, setLast] = useState({ price: 160, up: true, top: 50 });

  const publish = useCallback((price: number, up: boolean, top: number) => {
    setTrades((t) => t + 1);
    setLast({ price, up, top });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // reduced motion freezes the chart as a complete static snapshot; the
    // price tracker is hidden by a media query rather than by state
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const nextCandle = createEngine();
    let candles: Candle[] = [];
    let spacing = TARGET_SPACING;
    let logicalW = 900;
    let scale = 1;
    let offset = 0;
    let lo = 40;
    let hi = 280;
    let primed = false;

    const measure = () => {
      const rect = frame.getBoundingClientRect();
      if (!rect.height || !rect.width) return false;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      scale = rect.height / LOGICAL_H;
      logicalW = rect.width / scale;

      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);

      const visible = Math.max(MIN_CANDLES, Math.round(logicalW / TARGET_SPACING));
      // the series stops just short of the frame edge so the last-close dot
      // lands clear of the right-hand fade instead of being washed out by it
      spacing = (logicalW * LIVE_EDGE) / visible;

      // seed a full chart so the frame is never empty
      while (candles.length < visible + 1) candles.push(nextCandle());
      if (candles.length > visible + 1) candles = candles.slice(candles.length - (visible + 1));
      return true;
    };

    const TOP_PAD = 26;
    const BOTTOM_PAD = 46;
    const FLOOR = LOGICAL_H - 12;
    const plotH = LOGICAL_H - BOTTOM_PAD - TOP_PAD;

    const yOf = (p: number) => TOP_PAD + (1 - (p - lo) / (hi - lo)) * plotH;

    const autoscale = () => {
      let min = Infinity;
      let max = -Infinity;
      for (const k of candles) {
        if (k.l < min) min = k.l;
        if (k.h > max) max = k.h;
      }
      const pad = Math.max(6, (max - min) * 0.12);
      const tLo = min - pad;
      const tHi = max + pad;
      if (!primed) {
        lo = tLo;
        hi = tHi;
        primed = true;
      } else {
        lo += (tLo - lo) * 0.06;
        hi += (tHi - hi) * 0.06;
      }
    };

    const draw = () => {
      autoscale();
      ctx.clearRect(0, 0, logicalW, LOGICAL_H);

      // grid, behind everything
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#0D1520';
      for (let i = 0; i < 6; i += 1) {
        const y = Math.round((LOGICAL_H / 6) * (i + 0.5)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(logicalW, y);
        ctx.stroke();
      }
      ctx.strokeStyle = '#0B121C';
      for (let i = 0; i < 10; i += 1) {
        const x = Math.round((logicalW / 10) * (i + 0.5)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, LOGICAL_H);
        ctx.stroke();
      }

      const pts: { x: number; y: number }[] = [];

      candles.forEach((k, i) => {
        const x = i * spacing - offset;
        if (x < -20 || x > logicalW + 20) return;

        const color = k.up ? UP : DOWN;
        const yO = yOf(k.o);
        const yC = yOf(k.c);
        const bodyTop = Math.min(yO, yC);
        const bodyH = Math.max(2.5, Math.abs(yC - yO));
        const bodyBottom = bodyTop + bodyH;
        const doji = Math.abs(k.o - k.c) < 1.5;

        // 1. floor shadow — the primary depth cue; heavier bodies cast wider
        ctx.beginPath();
        ctx.ellipse(x, FLOOR, bodyH > 14 ? 5.5 : 4, 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,.5)';
        ctx.fill();

        // 2. drop line down to the floor, reinforcing the lift
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, bodyBottom);
        ctx.lineTo(x, FLOOR);
        ctx.stroke();

        // 3. wick
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, yOf(k.h));
        ctx.lineTo(x, yOf(k.l));
        ctx.stroke();

        // 4. body — a doji collapses to a rule so it stays readable
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        if (doji) {
          ctx.fillRect(x - 3.5, bodyTop + bodyH / 2 - 0.6, 7, 1.2);
        } else {
          ctx.beginPath();
          ctx.roundRect(x - 3.5, bodyTop, 7, bodyH, 1);
          ctx.fill();
        }

        pts.push({ x, y: yC });
      });

      ctx.globalAlpha = 1;

      if (pts.length > 1) {
        // filled area under the equity line
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (const p of pts) ctx.lineTo(p.x, p.y);
        ctx.lineTo(pts[pts.length - 1].x, FLOOR);
        ctx.lineTo(pts[0].x, FLOOR);
        ctx.closePath();
        ctx.fillStyle = 'rgba(217,148,5,.07)';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (const p of pts) ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = AMBER;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        const tip = pts[pts.length - 1];
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(217,148,5,.16)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = AMBER;
        ctx.fill();
      }
    };

    if (!measure()) return;
    draw();

    const tail = candles[candles.length - 1];
    setLast({
      price: tail.c,
      up: tail.up,
      top: Math.min(92, Math.max(4, (yOf(tail.c) / LOGICAL_H) * 100)),
    });

    const ro = new ResizeObserver(() => {
      if (measure()) draw();
    });
    ro.observe(frame);

    if (reduced) return () => ro.disconnect();

    let raf = 0;
    let prev = performance.now();

    const loop = (now: number) => {
      const delta = now - prev;
      prev = now;

      // a backgrounded tab resumes cleanly instead of fast-forwarding
      if (delta > FRAME_GAP_LIMIT) {
        raf = requestAnimationFrame(loop);
        return;
      }

      offset += SCROLL_PX;
      if (offset >= spacing) {
        offset -= spacing;
        candles.shift();
        const fresh = nextCandle();
        candles.push(fresh);
        publish(fresh.c, fresh.up, Math.min(92, Math.max(4, (yOf(fresh.c) / LOGICAL_H) * 100)));
      }

      draw();
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [publish]);

  return (
    <div className="chartcard chart3d" ref={frameRef}>
      <div className="chart3d-plane">
        <canvas ref={canvasRef} className="chart3d-canvas" aria-hidden="true" />
      </div>

      <div className="chart3d-wash" />

      <p className="chart3d-eyebrow">PRICE ACTION / SCORED ON CLOSE</p>

      {/* original chip design, kept verbatim — only the count is now live */}
      <div className="chip">
        <b>JOURNALED AUTOMATICALLY</b>
        <span>{trades.toLocaleString('en-US')} TRADES</span>
      </div>

      <div
        className={`chart3d-price${last.up ? '' : ' is-down'}`}
        style={{ top: `${last.top}%` }}
      >
        {last.price.toFixed(2)}
      </div>
    </div>
  );
}

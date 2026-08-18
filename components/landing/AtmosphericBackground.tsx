'use client';

/**
 * Four-layer atmospheric background, lifted from the Hero treatment so every
 * landing-page panel sits on the same warm-blurred image + aurora wash.
 *
 *   1. Blurred hero photograph (warm, abstract) — sets the mood.
 *   2. Dark gradient overlay — keeps copy readable on top.
 *   3. .aurora-bg ambient — animated radial gradients (pink, cyan, emerald, orange).
 *   4. Three soft color blobs — gives each section its own little aurora.
 *
 * Drop in as the first child of any `<section className="relative overflow-hidden">`.
 *
 * `variant`:
 *   - "hero"   — matches the original Hero intensity (opacity 30, brighter blobs).
 *   - "subtle" — default. Quieter image + dimmer blobs so the page doesn't read as
 *     nine identical hero panels. Each section still picks up the atmosphere
 *     without the foreground copy fighting for attention.
 */
export default function AtmosphericBackground({ variant = 'subtle' }: { variant?: 'hero' | 'subtle' }) {
  const isHero = variant === 'hero';
  return (
    <>
      {/* 1. Blurred photograph — the atlas bull/bear FX graphic, heavily blurred
          and desaturated so it reads as an on-brand green/pink wash rather than a
          literal scene, matching the site-wide body::before backdrop. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none bg-cover bg-center"
        style={{
          backgroundImage: "url('/atlas-background.png')",
          filter: 'blur(8px) saturate(1.1) brightness(1.05)',
          transform: 'scale(1.06)',
          opacity: isHero ? 0.4 : 0.18,
        }}
      />
      {/* 2. Dark gradient overlay — keeps copy readable on top of the photo */}
      <div
        aria-hidden
        className={
          isHero
            ? 'absolute inset-0 pointer-events-none bg-gradient-to-b from-[var(--background)]/80 via-[var(--background)]/70 to-[var(--background)]'
            : 'absolute inset-0 pointer-events-none bg-gradient-to-b from-[var(--background)]/75 via-[var(--background)]/65 to-[var(--background)]/85'
        }
      />
      {/* 3. Aurora ambient (animated radial gradients defined in globals.css) */}
      <div className="aurora-bg" aria-hidden />
      {/* 4. Three soft color blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className={`absolute top-1/3 left-1/4 w-[500px] h-[400px] bg-[#d99405] ${isHero ? 'opacity-[0.06]' : 'opacity-[0.025]'} rounded-full blur-[140px]`} />
        <div className={`absolute top-1/4 right-1/3 w-[420px] h-[360px] bg-cyan-400 ${isHero ? 'opacity-[0.05]' : 'opacity-[0.022]'} rounded-full blur-[130px]`} />
        <div className={`absolute bottom-0 right-1/4 w-[400px] h-[350px] bg-emerald-400 ${isHero ? 'opacity-[0.04]' : 'opacity-[0.018]'} rounded-full blur-[120px]`} />
      </div>
    </>
  );
}

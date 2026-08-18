'use client';

export default function Games() {
  return (
    <div style={{ position: 'relative' }}>
      <div className="phead">
        <p className="eyebrow">Soon to release</p>
        <h2>Trading games</h2>
        <p className="sub">
          Sharpen your edge through gamified challenges. Compete, level up, and earn USDT rewards.
        </p>
      </div>

      <div className="split-3">
        {[
          { title: 'Pattern Spotter', emoji: '🎯', desc: 'Identify chart patterns under time pressure.' },
          { title: 'Risk Manager',    emoji: '⚖️', desc: 'Survive 100 trades with the right position sizing.' },
          { title: 'Bias Buster',     emoji: '🧠', desc: 'Spot the cognitive bias before it hits your P&L.' },
          { title: 'Setup Sprint',    emoji: '⚡', desc: 'Build a rule-based setup in under 60 seconds.' },
          { title: 'Drawdown Run',    emoji: '🛡️', desc: 'Protect capital through a market storm.' },
          { title: 'News Reactor',    emoji: '📰', desc: 'Decide: trade the news or sit it out?' },
        ].map((g) => (
          <div key={g.title} className="card" style={{ padding: '26px 24px 22px' }}>
            <span className="accent" style={{ background: 'var(--amber)', width: 48 }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <span style={{ fontSize: 28, lineHeight: '32px' }}>{g.emoji}</span>
              <span
                className="lbl b95"
                style={{ marginLeft: 'auto', color: 'var(--amber)', letterSpacing: '.04em' }}
              >
                SOON
              </span>
            </div>
            <h4 style={{ marginTop: 18 }}>{g.title}</h4>
            <p className="sub">{g.desc}</p>
            <p className="sub sm" style={{ marginTop: 16, color: 'var(--green)' }}>Earn USDT</p>
          </div>
        ))}
      </div>

      <div className="note" style={{ height: 'auto', padding: '18px', marginTop: 32 }}>
        Want early access? Active subscribers get the closed beta first — stay tuned.
      </div>
    </div>
  );
}

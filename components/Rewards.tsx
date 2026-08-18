'use client';

import { Calendar, Monitor, TrendingUp, User } from 'lucide-react';

export default function Rewards() {
  return (
    <div style={{ position: 'relative' }}>
      <div className="phead">
        <p className="eyebrow" style={{ color: '#fff' }}>Loyalty program</p>
        <h2>Rewards &amp; Bonuses</h2>
        <p className="sub">
          Earn perks for being active — free subscription extensions, funded account raffles, and more.
        </p>
      </div>

      {/* Featured rewards */}
      <div className="split">
        <div className="reward">
          <span className="accent" style={{ background: 'var(--green)' }} />
          <div className="rtop">
            <span
              className="ic"
              style={{
                border: '1px solid rgba(36,200,138,.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 16 13" fill="none" aria-hidden="true">
                <rect x="1.65" y="4.65" width="12.7" height="7.7" rx="1.3" stroke="#24c88a" strokeWidth="1.1" />
                <path d="M8 4.5v8M4 1a2 2 0 004 3.5A2 2 0 0112 1" stroke="#24c88a" strokeWidth="1.1" />
              </svg>
            </span>
            <h4>Free 1-month subscription</h4>
            <span className="tag" style={{ background: '#0f2018', color: 'var(--green)' }}>ACTIVE</span>
          </div>
          <p>
            Hit 30 trades logged + 7-day reflection streak this month → automatic next-month free extension.
          </p>
          <div className="prog"><i style={{ width: '0%' }} /></div>
          <p className="st">0 / 30 trades · 0 / 7 reflection days</p>
        </div>

        <div className="reward">
          <span className="accent" style={{ background: 'var(--amber)' }} />
          <div className="rtop">
            <span
              className="ic"
              style={{
                border: '1px solid rgba(217,148,5,.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="24" height="18" viewBox="0 0 17 13" fill="none" aria-hidden="true">
                <path d="M.5 .5h16v4a2 2 0 000 4v4H.5v-4a2 2 0 000-4v-4Z" stroke="#d99405" strokeWidth="1.1" />
              </svg>
            </span>
            <h4>Funded Account Raffle</h4>
            <span className="tag" style={{ background: '#2a1f0a', color: 'var(--amber)' }}>MONTHLY</span>
          </div>
          <p>
            Every completed monthly review = 1 raffle ticket toward a $10K funded account challenge.
          </p>
          <p className="st" style={{ marginTop: 36 }}>
            <b style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--text)' }}>0 tickets</b>
            {' '}· next draw on the 1st
          </p>
        </div>
      </div>

      {/* How to earn */}
      <div className="card" style={{ marginTop: 32, padding: '25px 28px 34px' }}>
        <h3 style={{ fontSize: 17, marginLeft: 26 }}>Ways to earn</h3>
        <div className="earn">
          {[
            { icon: Calendar,   label: 'Daily reflection',       reward: '+1 streak point' },
            { icon: TrendingUp, label: 'Hit weekly profit goal', reward: '+1 raffle ticket' },
            { icon: User,       label: 'Refer a friend',         reward: '1 month free per signup' },
            { icon: Monitor,    label: 'Complete a course',      reward: '+3 raffle tickets' },
          ].map(({ icon: Icon, label, reward }) => (
            <div key={label}>
              <Icon size={16} style={{ color: 'var(--teal)', flex: 'none' }} />
              {label}
              <b>{reward}</b>
            </div>
          ))}
        </div>
        <p className="footnote" style={{ marginTop: 66 }}>
          Tracking system in development — rewards will be auto-credited once activity tracking is live.
        </p>
      </div>
    </div>
  );
}

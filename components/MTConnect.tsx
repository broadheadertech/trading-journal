'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Plug, Copy, Check, ArrowsClockwise, Power, ArrowSquareOut, DownloadSimple, ShieldCheck, Warning, CaretDown, CaretUp, Eye, EyeSlash } from '@phosphor-icons/react';

const WEBHOOK_PATH = '/api/mt5-sync';

function getWebhookUrl(): string {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return `<set NEXT_PUBLIC_CONVEX_URL>${WEBHOOK_PATH}`;
  // Convex HTTP actions are exposed at the deployment's .convex.site domain
  // (e.g. https://flowing-ant-123.convex.site). The default .convex.cloud URL
  // is for the WebSocket client.
  const httpUrl = convexUrl.replace('.convex.cloud', '.convex.site');
  return `${httpUrl}${WEBHOOK_PATH}`;
}

const VT_SERVERS = [
  'VTMarkets-Live',
  'VTMarkets-Live 2',
  'VTMarkets-Live 3',
  'VTMarkets-Demo',
];

export default function MTConnect() {
  const conn = useQuery(api.mtConnections.getMine);
  const connect = useMutation(api.mtConnections.connect);
  const regenerate = useMutation(api.mtConnections.regenerateToken);
  const disconnect = useMutation(api.mtConnections.disconnect);

  const [brokerName, setBrokerName] = useState('VT Markets');
  const [mtAccountNumber, setMtAccountNumber] = useState('');
  const [mtServer, setMtServer] = useState('VTMarkets-Live');
  /* null = follow the connection state. Someone still setting up wants the
     steps open; someone already connected is here to copy a token or check
     last-sync, and does not want to scroll past five steps to do it. */
  const [showInstructions, setShowInstructions] = useState<boolean | null>(null);
  /* The sync token authenticates writes into this account's journal, so it
     is masked until asked for. It used to sit in plaintext on a dashboard
     people screen-share and screenshot — anyone who read it could POST
     fabricated trades into the journal. Copy still copies the real value. */
  const [showToken, setShowToken] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const webhookUrl = getWebhookUrl();
  const isConnected = conn !== null && conn !== undefined && conn.isActive;
  const isLoading = conn === undefined;
  const instructionsOpen = showInstructions ?? !isConnected;

  function copy(value: string, field: string) {
    void navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  }

  async function handleConnect() {
    await connect({
      brokerName,
      mtAccountNumber: mtAccountNumber.trim() || undefined,
      mtServer: mtServer.trim() || undefined,
    });
  }

  async function handleRegenerate() {
    await regenerate();
    setConfirmRegen(false);
  }

  async function handleDisconnect() {
    await disconnect();
    setConfirmDisconnect(false);
  }

  return (
    <div className="pwrap">
      <div className="phead">
        <p className="eyebrow">
          <Plug size={13} style={{ color: 'var(--amber)' }} />
          Read-only · auto-imports closed trades from MT4/MT5
        </p>
        <h2>Connect your broker</h2>
        <p className="sub" style={{ maxWidth: 700 }}>
          Install our Expert Advisor in MT4/MT5 once and every closed trade syncs automatically into your journal —
          no copy-paste, no spreadsheets. Works with VT Markets and any broker on MetaTrader.
        </p>
      </div>

      {/* Connection status / form */}
      {isLoading ? (
        <div className="card" style={{ padding: '25px 28px 34px', minHeight: 160 }}>
          <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
          <p className="sub">Loading connection…</p>
        </div>
      ) : !isConnected ? (
        <div className="card" style={{ padding: '25px 28px 34px' }}>
          <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
          <h3 style={{ fontSize: 17 }}>Set up sync</h3>
          <p className="sub" style={{ fontSize: 13, color: 'var(--muted)' }}>
            Tell us which broker you trade with — we&apos;ll generate a unique sync token for your Expert Advisor.
          </p>

          <div className="split-3" style={{ marginTop: 34 }}>
            <div className="field">
              <label>BROKER</label>
              <input className="box" style={{ display: 'block', width: '100%', font: 'inherit', fontSize: 13 }} value={brokerName} onChange={e => setBrokerName(e.target.value)} placeholder="VT Markets" />
            </div>
            <div className="field">
              <label>ACCOUNT #</label>
              <input className="box" style={{ display: 'block', width: '100%', font: 'inherit', fontSize: 13 }} value={mtAccountNumber} onChange={e => setMtAccountNumber(e.target.value)} placeholder="e.g. 1234567" />
            </div>
            <div className="field">
              <label>MT5 SERVER</label>
              <input className="box" style={{ display: 'block', width: '100%', font: 'inherit', fontSize: 13 }} list="vt-servers" value={mtServer} onChange={e => setMtServer(e.target.value)} placeholder="VTMarkets-Live" />
              <datalist id="vt-servers">
                {VT_SERVERS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          <button onClick={handleConnect} className="btn-a" style={{ height: 41, marginTop: 25 }}>
            <Plug size={14} /> Generate Sync Token
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: '25px 28px 34px' }}>
          <span className="accent" style={{ width: 56, background: 'var(--green)' }} />
          <div className="cardhead">
            <div>
              <h3 style={{ fontSize: 17, display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={16} style={{ color: 'var(--green)' }} /> Connected
              </h3>
              <p className="sub" style={{ fontSize: 13, color: 'var(--muted)' }}>
                {conn?.brokerName ?? 'Broker'}
                {conn?.mtAccountNumber && ` · #${conn.mtAccountNumber}`}
                {conn?.mtServer && ` · ${conn.mtServer}`}
              </p>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <em style={{ fontStyle: 'normal', fontFamily: 'var(--mono)', fontSize: 26, lineHeight: '34px', display: 'block' }}>
                {conn?.tradesSynced ?? 0}
              </em>
              <p className="lbl">TRADES SYNCED</p>
            </div>
          </div>

          {/* Status */}
          <span className="pill" style={{ marginTop: 20, background: conn?.lastSyncAt ? '#0f2018' : '#1a1408', color: conn?.lastSyncAt ? 'var(--green)' : 'var(--amber)' }}>
            {conn?.lastSyncAt
              ? `Last sync ${timeAgo(conn.lastSyncAt)}`
              : 'Awaiting first sync — install the EA in MT5 to start'}
          </span>

          {/* Token */}
          <div className="field" style={{ marginTop: 26 }}>
            <label>YOUR SYNC TOKEN</label>
            <div className="codebox" style={{ marginTop: 0 }}>
              <code style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--mono)' }}>
                {showToken ? conn?.syncToken : '•'.repeat(Math.min(conn?.syncToken?.length ?? 24, 40))}
              </code>
              <button
                onClick={() => setShowToken(v => !v)}
                className="chip"
                style={{ marginLeft: 12, height: 24, gap: 6 }}
                aria-label={showToken ? 'Hide sync token' : 'Reveal sync token'}
              >
                {showToken ? <><EyeSlash size={11} /> Hide</> : <><Eye size={11} /> Reveal</>}
              </button>
              <button onClick={() => copy(conn!.syncToken, 'token')} className="chip" style={{ marginLeft: 8, height: 24, gap: 6 }}>
                {copiedField === 'token' ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
              </button>
            </div>
          </div>

          {/* Webhook URL */}
          <div className="field" style={{ marginTop: 20 }}>
            <label>WEBHOOK URL (PASTE INTO MT5)</label>
            <div className="codebox" style={{ marginTop: 0 }}>
              <code style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--mono)' }}>{webhookUrl}</code>
              <button onClick={() => copy(webhookUrl, 'url')} className="chip" style={{ marginLeft: 12, height: 24, gap: 6 }}>
                {copiedField === 'url' ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 26, paddingTop: 22, borderTop: '1px solid var(--line)' }}>
            {confirmRegen ? (
              <>
                <span style={{ fontSize: 12.5, color: 'var(--amber)' }}>Old token will stop working. Sure?</span>
                <button onClick={handleRegenerate} className="btn-a" style={{ height: 32, fontSize: 12 }}>Regenerate</button>
                <button onClick={() => setConfirmRegen(false)} className="chip">Cancel</button>
              </>
            ) : (
              <button onClick={() => setConfirmRegen(true)} className="btn-g" style={{ height: 36, fontSize: 12.5 }}>
                <ArrowsClockwise size={12} /> Regenerate token
              </button>
            )}

            {confirmDisconnect ? (
              <>
                <span style={{ fontSize: 12.5, color: 'var(--amber)' }}>Disconnect — historical trades stay. Sure?</span>
                <button onClick={handleDisconnect} className="btn-a" style={{ height: 32, fontSize: 12 }}>Disconnect</button>
                <button onClick={() => setConfirmDisconnect(false)} className="chip">Cancel</button>
              </>
            ) : (
              <button onClick={() => setConfirmDisconnect(true)} className="btn-g" style={{ height: 36, fontSize: 12.5, color: 'var(--amber)', borderColor: '#3a2a12' }}>
                <Power size={12} /> Disconnect
              </button>
            )}
          </div>
        </div>
      )}

      {/* Install instructions */}
      <div className="card" style={{ marginTop: 48, padding: '22px 28px 30px' }}>
        <button
          onClick={() => setShowInstructions(!instructionsOpen)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left' }}
        >
          <DownloadSimple size={16} style={{ color: 'var(--amber)' }} />
          <h3 style={{ fontSize: 17 }}>Install instructions (MetaTrader 5)</h3>
          {instructionsOpen
            ? <CaretUp size={14} style={{ marginLeft: 'auto', color: 'var(--muted)' }} />
            : <CaretDown size={14} style={{ marginLeft: 'auto', color: 'var(--muted)' }} />}
        </button>

        {instructionsOpen && (
          <>
            <p className="sub" style={{ fontSize: 13, color: 'var(--muted)' }}>
              One-time setup. Takes about 5 minutes. The EA only reads your trade data — it cannot place trades.
            </p>

            <div className="steps">
              <Step n={1} title="Download the EA">
                {/* The .ex5 button was removed: no atlas-sync.ex5 is shipped in
                    public/, so it 404'd on every click. MT5 compiles the .ex5
                    itself in step 3, which is the supported path anyway. */}
                <div className="btns">
                  <a href="/atlas-sync.mq5" download className="sm amber">
                    <DownloadSimple size={12} /> Download atlas-sync.mq5
                  </a>
                </div>
                <p>
                  This is the EA source. You will place it in MT5 next, then compile it — MT5 produces the runnable <code>.ex5</code> for you.
                </p>
              </Step>

              {/* Used to say "drop atlas-sync.ex5 here" while step 1 had already
                  said to drop the .mq5 there and compile it — two different files,
                  two different instructions, for the same folder. */}
              <Step n={2} title="Put it in MT5's Experts folder">
                <p>
                  In MT5: <code style={{ color: 'var(--amber)' }}>File → Open Data Folder</code>, then go into <code style={{ color: 'var(--amber)' }}>MQL5 → Experts</code>. Drop the downloaded <code>atlas-sync.mq5</code> there.
                </p>
              </Step>

              <Step n={3} title="Compile it">
                <p>
                  Back in MT5, right-click <code>atlas-sync</code> in the Navigator panel → <strong>Modify</strong> → <strong>Compile (F7)</strong>. MT5 writes the <code>atlas-sync.ex5</code> next to the source; that compiled file is what actually runs.
                </p>
              </Step>

              <Step n={4} title="Allow the webhook URL">
                <p>
                  In MT5: <code style={{ color: 'var(--amber)' }}>Tools → Options → Expert Advisors</code>. Tick <strong>&quot;Allow WebRequest for listed URL&quot;</strong> and add this URL:
                </p>
                <div className="codebox">
                  <code style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--mono)' }}>{webhookUrl}</code>
                  <button onClick={() => copy(webhookUrl, 'url2')} className="chip" style={{ marginLeft: 12, height: 24, gap: 6 }}>
                    {copiedField === 'url2' ? <Check size={11} /> : <Copy size={11} />}
                  </button>
                </div>
              </Step>

              <Step n={5} title="Restart MT5">
                <p>
                  Close MT5 fully and reopen it. You should see <code>atlas-sync</code> in the Navigator panel under <code style={{ color: 'var(--amber)' }}>Expert Advisors</code>.
                </p>
              </Step>

              <Step n={6} title="Attach to a chart + paste token">
                <p>
                  Open any chart (any symbol). Drag <code>atlas-sync</code> from Navigator onto it. In the EA&apos;s <strong>&quot;Inputs&quot;</strong> tab, paste your token:
                </p>
                {isConnected && (
                  <div className="codebox">
                    <code style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--mono)' }}>
                      {showToken ? conn?.syncToken : '•'.repeat(Math.min(conn?.syncToken?.length ?? 24, 40))}
                    </code>
                    <button onClick={() => setShowToken(v => !v)} className="chip" style={{ marginLeft: 12, height: 24, gap: 6 }}>
                      {showToken ? <EyeSlash size={11} /> : <Eye size={11} />}
                    </button>
                    <button onClick={() => copy(conn!.syncToken, 'token2')} className="chip" style={{ marginLeft: 8, height: 24, gap: 6 }}>
                      {copiedField === 'token2' ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  </div>
                )}
                <p>
                  Click OK. A smiley face <span style={{ color: 'var(--green)' }}>🙂</span> in the top-right of the chart means it&apos;s running. The EA will backfill your last 90 days on startup, then sync new trades as they close.
                </p>
              </Step>
            </div>

            <div className="warn">
              <Warning size={18} style={{ color: 'var(--amber)', flex: 'none' }} />
              <p style={{ margin: 0 }}>
                <b>MT5 must be running</b> for trades to sync in real time.
                If MT5 is offline, the EA backfills any deals that closed while it was off the next time you open it.
                For 24/7 sync, run MT5 on a VPS — VT Markets offers a free VPS to clients meeting their volume requirements.
              </p>
            </div>

            <a href="https://www.metaquotes.net/en/metatrader5/help/expertadvisors/installing_ea" target="_blank" rel="noopener noreferrer" className="doclink">
              MetaQuotes EA install docs <ArrowSquareOut size={13} />
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="step">
      <span className="n">{n}</span>
      <div>
        <h5>{title}</h5>
        {children}
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

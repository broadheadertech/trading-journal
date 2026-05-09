'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Plug, Copy, Check, RefreshCw, Power, ExternalLink, Download, ShieldCheck, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [showInstructions, setShowInstructions] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const webhookUrl = getWebhookUrl();
  const isConnected = conn !== null && conn !== undefined && conn.isActive;
  const isLoading = conn === undefined;

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
    <div className="relative space-y-6 anim-fade-up">
      <div className="hero-glow" />

      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-[var(--muted-foreground)]">
          <Plug size={12} className="text-pink-400" />
          Read-only · auto-imports closed trades from MT4/MT5
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
          Connect <span className="gradient-text">your broker</span>
        </h1>
        <p className="text-base text-[var(--muted-foreground)] max-w-2xl">
          Install our Expert Advisor in MT4/MT5 once and every closed trade syncs automatically into your journal —
          no copy-paste, no spreadsheets. Works with VT Markets and any broker on MetaTrader.
        </p>
      </header>

      {/* Connection status / form */}
      {isLoading ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 animate-pulse h-40" />
      ) : !isConnected ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Plug size={16} className="text-pink-400" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">Set up sync</h2>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tell us which broker you trade with — we'll generate a unique sync token for your Expert Advisor.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5 block">Broker</label>
              <input value={brokerName} onChange={e => setBrokerName(e.target.value)} placeholder="VT Markets" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5 block">Account #</label>
              <input value={mtAccountNumber} onChange={e => setMtAccountNumber(e.target.value)} placeholder="e.g. 1234567" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5 block">MT5 Server</label>
              <input list="vt-servers" value={mtServer} onChange={e => setMtServer(e.target.value)} placeholder="VTMarkets-Live" />
              <datalist id="vt-servers">
                {VT_SERVERS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          <button
            onClick={handleConnect}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-900 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-300 hover:to-amber-300 shadow-[0_0_20px_-4px_rgba(251,146,60,0.6)] transition-all"
          >
            <Plug size={14} /> Generate Sync Token
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-pink-500/40 bg-gradient-to-br from-pink-500/10 via-fuchsia-500/5 to-transparent p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck size={18} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-base font-bold text-[var(--foreground)]">Connected</div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {conn?.brokerName ?? 'Broker'}
                  {conn?.mtAccountNumber && ` · #${conn.mtAccountNumber}`}
                  {conn?.mtServer && ` · ${conn.mtServer}`}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[var(--foreground)] tabular-nums">{conn?.tradesSynced ?? 0}</div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Trades synced</div>
            </div>
          </div>

          {/* Token */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Your sync token</label>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-black/30 p-3 font-mono text-xs">
              <code className="flex-1 break-all text-[var(--foreground)]">{conn?.syncToken}</code>
              <button onClick={() => copy(conn!.syncToken, 'token')} className="px-2 py-1 rounded text-[10px] bg-[var(--muted)]/40 hover:bg-[var(--muted)]/60 transition-colors text-[var(--foreground)] inline-flex items-center gap-1">
                {copiedField === 'token' ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
              </button>
            </div>
          </div>

          {/* Webhook URL */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Webhook URL (paste into MT5)</label>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-black/30 p-3 font-mono text-xs">
              <code className="flex-1 break-all text-[var(--foreground)]">{webhookUrl}</code>
              <button onClick={() => copy(webhookUrl, 'url')} className="px-2 py-1 rounded text-[10px] bg-[var(--muted)]/40 hover:bg-[var(--muted)]/60 transition-colors text-[var(--foreground)] inline-flex items-center gap-1">
                {copiedField === 'url' ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
              </button>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full ${conn?.lastSyncAt ? 'bg-emerald-400 opacity-75 animate-ping' : 'bg-amber-400 opacity-50'}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${conn?.lastSyncAt ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </span>
              {conn?.lastSyncAt
                ? `Last sync ${timeAgo(conn.lastSyncAt)}`
                : 'Awaiting first sync — install the EA in MT5 to start'}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]">
            {confirmRegen ? (
              <>
                <span className="text-xs text-amber-300">Old token will stop working. Sure?</span>
                <button onClick={handleRegenerate} className="px-3 py-1 rounded text-[10px] bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors font-semibold">Regenerate</button>
                <button onClick={() => setConfirmRegen(false)} className="px-3 py-1 rounded text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">Cancel</button>
              </>
            ) : (
              <button onClick={() => setConfirmRegen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--foreground)] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50 transition-colors">
                <RefreshCw size={11} /> Regenerate token
              </button>
            )}

            {confirmDisconnect ? (
              <>
                <span className="text-xs text-amber-300">Disconnect — historical trades stay. Sure?</span>
                <button onClick={handleDisconnect} className="px-3 py-1 rounded text-[10px] bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors font-semibold">Disconnect</button>
                <button onClick={() => setConfirmDisconnect(false)} className="px-3 py-1 rounded text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">Cancel</button>
              </>
            ) : (
              <button onClick={() => setConfirmDisconnect(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-300 border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-colors">
                <Power size={11} /> Disconnect
              </button>
            )}
          </div>
        </div>
      )}

      {/* Install instructions */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <button
          onClick={() => setShowInstructions(v => !v)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[var(--muted)]/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Download size={16} className="text-pink-400" />
            <span className="font-semibold text-[var(--foreground)]">Install instructions (MetaTrader 5)</span>
          </div>
          {showInstructions ? <ChevronUp size={16} className="text-[var(--muted-foreground)]" /> : <ChevronDown size={16} className="text-[var(--muted-foreground)]" />}
        </button>

        {showInstructions && (
          <div className="px-5 pb-5 space-y-4 border-t border-[var(--border)]">
            <p className="text-sm text-[var(--muted-foreground)] pt-4">
              One-time setup. Takes about 5 minutes. The EA only reads your trade data — it cannot place trades.
            </p>

            <ol className="space-y-3 text-sm">
              <Step n={1} title="Download the EA">
                <div className="flex flex-wrap items-center gap-2">
                  <a href="/tradia-sync.mq5" download className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-900 bg-gradient-to-r from-pink-400 to-fuchsia-400 hover:from-pink-300 hover:to-fuchsia-300 transition-all">
                    <Download size={12} /> Download tradia-sync.mq5
                  </a>
                  <a href="/tradia-sync.ex5" download className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--foreground)] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/50 transition-colors">
                    <Download size={12} /> tradia-sync.ex5 <span className="text-[10px] text-[var(--muted-foreground)]">(if compiled)</span>
                  </a>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-2 leading-relaxed">
                  Most users want the <strong className="text-pink-400">.mq5</strong> source. Drop it in MT5's <code>MQL5/Experts</code> folder, then in MT5 right-click <code>tradia-sync</code> in Navigator → <strong>Modify</strong> → <strong>Compile (F7)</strong>. MT5 will produce the <code>.ex5</code> automatically. The <code>.ex5</code> button above is for cases where the developer pre-compiled and uploaded it.
                </p>
              </Step>

              <Step n={2} title="Open MT5's data folder">
                In MT5: <code className="text-pink-400">File → Open Data Folder</code>, then go into <code className="text-pink-400">MQL5 → Experts</code>. Drop <code>tradia-sync.ex5</code> in this folder.
              </Step>

              <Step n={3} title="Allow the webhook URL">
                In MT5: <code className="text-pink-400">Tools → Options → Expert Advisors</code>. Tick <strong>"Allow WebRequest for listed URL"</strong> and add this URL:
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-black/30 p-2 font-mono text-[11px]">
                  <code className="flex-1 break-all">{webhookUrl}</code>
                  <button onClick={() => copy(webhookUrl, 'url2')} className="px-2 py-0.5 rounded text-[10px] bg-[var(--muted)]/40 hover:bg-[var(--muted)]/60 transition-colors text-[var(--foreground)] inline-flex items-center gap-1">
                    {copiedField === 'url2' ? <Check size={10} /> : <Copy size={10} />}
                  </button>
                </div>
              </Step>

              <Step n={4} title="Restart MT5">
                Close MT5 fully and reopen it. You should see <code>tradia-sync</code> in the Navigator panel under <code className="text-pink-400">Expert Advisors</code>.
              </Step>

              <Step n={5} title="Attach to a chart + paste token">
                Open any chart (any symbol). Drag <code>tradia-sync</code> from Navigator onto it. In the EA's <strong>"Inputs"</strong> tab, paste your token:
                {isConnected && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-black/30 p-2 font-mono text-[11px]">
                    <code className="flex-1 break-all">{conn?.syncToken}</code>
                    <button onClick={() => copy(conn!.syncToken, 'token2')} className="px-2 py-0.5 rounded text-[10px] bg-[var(--muted)]/40 hover:bg-[var(--muted)]/60 transition-colors text-[var(--foreground)] inline-flex items-center gap-1">
                      {copiedField === 'token2' ? <Check size={10} /> : <Copy size={10} />}
                    </button>
                  </div>
                )}
                <p className="text-xs text-[var(--muted-foreground)] mt-2">
                  Click OK. A smiley face <span className="text-emerald-400">🙂</span> in the top-right of the chart means it's running. The EA will backfill your last 90 days on startup, then sync new trades as they close.
                </p>
              </Step>
            </ol>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                <span className="font-semibold text-[var(--foreground)]">MT5 must be running</span> for trades to sync in real time.
                If MT5 is offline, the EA backfills any deals that closed while it was off the next time you open it.
                For 24/7 sync, run MT5 on a VPS — VT Markets offers a free VPS to clients meeting their volume requirements.
              </div>
            </div>

            <a href="https://www.metaquotes.net/en/metatrader5/help/expertadvisors/installing_ea" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 transition-colors">
              MetaQuotes EA install docs <ExternalLink size={11} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-pink-500/15 text-pink-300 text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">{n}</span>
      <div className="flex-1">
        <div className="font-semibold text-[var(--foreground)] mb-1">{title}</div>
        <div className="text-xs text-[var(--muted-foreground)] leading-relaxed">{children}</div>
      </div>
    </li>
  );
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

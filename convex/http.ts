import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

// ─── MT4/MT5 Expert Advisor sync webhook ────────────────────────────
// The tradia-sync EA POSTs every closed deal here. Auth is via the
// per-user sync token, sent as `X-Sync-Token` header (or `token` field
// in the JSON body for MQL5 simplicity).
http.route({
  path: "/api/mt5-sync",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: Record<string, unknown>;
    // Read the body as text first so we can log it on parse failure (helps diagnose EA encoding bugs)
    const rawText = await request.text();
    try {
      body = JSON.parse(rawText);
    } catch (e) {
      console.error("[mt5-sync] Invalid JSON received. Length:", rawText.length);
      console.error("[mt5-sync] First 500 chars:", rawText.slice(0, 500));
      console.error("[mt5-sync] Last 100 chars:", rawText.slice(-100));
      console.error("[mt5-sync] Parse error:", e instanceof Error ? e.message : String(e));
      // Extract bytes around the parse failure point so we can see what character broke it.
      const detail = e instanceof Error ? e.message : "parse failed";
      const posMatch = detail.match(/position (\d+)/);
      const pos = posMatch ? parseInt(posMatch[1], 10) : 0;
      const windowStart = Math.max(0, pos - 30);
      const windowEnd = Math.min(rawText.length, pos + 30);
      const aroundError = rawText.slice(windowStart, windowEnd);
      const charAtPos = pos < rawText.length ? rawText.charCodeAt(pos) : -1;
      return new Response(JSON.stringify({
        error: "Invalid JSON",
        detail,
        bytesReceived: rawText.length,
        aroundError,
        charAtPosCode: charAtPos,
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token =
      request.headers.get("x-sync-token") ??
      (typeof body.token === "string" ? body.token : null);

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const conn = await ctx.runQuery(api.mtConnections.getByToken, { token });
    if (!conn || !conn.isActive) {
      return new Response(JSON.stringify({ error: "Invalid or revoked token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Body shape: { deals: [ {...}, {...} ] } OR a single deal at top level
    const dealsRaw = Array.isArray(body.deals) ? body.deals : [body];
    const results: { ticket: string; status: "ok" | "skipped" | "error"; error?: string }[] = [];

    for (const raw of dealsRaw) {
      const d = raw as Record<string, unknown>;
      try {
        if (typeof d.ticket !== "string" && typeof d.ticket !== "number") {
          throw new Error("Missing ticket");
        }
        const deal = {
          ticket: String(d.ticket),
          symbol: String(d.symbol ?? "UNKNOWN"),
          direction: (d.direction === "short" ? "short" : "long") as "long" | "short",
          volume: Number(d.volume ?? 0),
          entryPrice: Number(d.entryPrice ?? d.openPrice ?? 0),
          exitPrice: Number(d.exitPrice ?? d.closePrice ?? 0),
          entryDate: String(d.entryDate ?? d.openTime ?? new Date().toISOString()),
          exitDate: String(d.exitDate ?? d.closeTime ?? new Date().toISOString()),
          profit: Number(d.profit ?? 0),
          stopLoss: typeof d.stopLoss === "number" ? d.stopLoss : (typeof d.sl === "number" ? d.sl : undefined),
          takeProfit: typeof d.takeProfit === "number" ? d.takeProfit : (typeof d.tp === "number" ? d.tp : undefined),
          commission: typeof d.commission === "number" ? d.commission : undefined,
          swap: typeof d.swap === "number" ? d.swap : undefined,
          comment: typeof d.comment === "string" ? d.comment : undefined,
        };

        const r = await ctx.runMutation(internal.mtConnections.ingestDeal, {
          userId: conn.userId,
          connectionId: conn._id,
          deal,
        });
        results.push({ ticket: deal.ticket, status: r.skipped ? "skipped" : "ok" });
      } catch (e) {
        results.push({
          ticket: typeof d.ticket === "string" || typeof d.ticket === "number" ? String(d.ticket) : "?",
          status: "error",
          error: e instanceof Error ? e.message : "Unknown",
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Lightweight ping for the EA to verify connectivity on startup
http.route({
  path: "/api/mt5-sync/ping",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const token = request.headers.get("x-sync-token") ?? new URL(request.url).searchParams.get("token");
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "Missing token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const conn = await ctx.runQuery(api.mtConnections.getByToken, { token });
    if (!conn || !conn.isActive) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid or revoked token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({
        ok: true,
        userId: conn.userId,
        tradesSynced: conn.tradesSynced,
        lastSyncAt: conn.lastSyncAt ?? null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }),
});

export default http;

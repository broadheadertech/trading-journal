// Pip / point / lot conversion shared between Trading Signals and the FX-style
// trade form. Single source of truth so the two surfaces always agree on what
// "0.01 lot × 10 pips" means in dollars.
//
// Defaults are tuned so the universal broker rule holds: at lot 0.01, 10 pips
// = $1. For gold that means the signal-provider convention (1 pip = $0.10),
// not the MT4 raw-tick convention (1 pip = $0.01).

import type { MarketType } from './types';

/**
 * Smallest price increment that counts as 1 pip for this market+symbol.
 *
 * Defaults are tuned so the universal rule holds for every market:
 *   0.01 lot × 10 pips = $1   ⟺   pip_size × contract_size = $10
 *
 * This is a SIMPLIFIED P&L model — JPY pairs use 0.0001 here, not the
 * industry-standard 0.01, because the alternative would require quote-currency
 * conversion. Users can override pip_size per-trade if they prefer the broker
 * display convention.
 */
export function defaultPipSize(market: MarketType | undefined, symbol: string): number {
  const sym = symbol.toUpperCase();
  if (sym.startsWith('XAU') || sym === 'GOLD') return 0.10;          // × 100 oz contract = $10
  if (sym.startsWith('XAG') || sym === 'SILVER') return 0.002;       // × 5000 oz contract = $10
  if (market === 'forex') return 0.0001;                              // × 100k contract = $10 (universal across JPY and non-JPY)
  if (market === 'metals') return 0.10;
  if (market === 'oil') return 0.01;                                  // × 1000 contract = $10
  if (market === 'stocks') return 0.01;                               // × 1000 share contract = $10
  return 1;                                                            // crypto: $1 per pip with 10-coin contract = $10
}

/**
 * Contract size — units of the base instrument per 1 standard lot.
 *
 * Calibrated against `defaultPipSize` so `pip × contract = $10` holds. That's
 * what makes the universal "0.01 lot × 10 pips = $1" rule work everywhere.
 */
export function defaultLotSize(market: MarketType | undefined, symbol: string): number {
  const sym = symbol.toUpperCase();
  if (sym.startsWith('XAU') || sym === 'GOLD') return 100;            // 100 oz / standard lot
  if (sym.startsWith('XAG') || sym === 'SILVER') return 5000;         // 5000 oz / standard lot
  if (market === 'forex') return 100_000;                              // 1 standard FX lot
  if (market === 'metals') return 100;
  if (market === 'oil') return 1000;
  if (market === 'stocks') return 1000;                                // 1 lot = 1000 shares
  return 10;                                                            // crypto: 1 lot = 10 units of the coin
}

/**
 * Pip distance between two prices (signed). Negative if `to` is below `from`.
 * Returns a raw count of pips, not a formatted string.
 */
export function pipsBetween(
  market: MarketType | undefined,
  symbol: string,
  from: number,
  to: number,
  pipSizeOverride?: number,
): number {
  const size = pipSizeOverride ?? defaultPipSize(market, symbol);
  if (!Number.isFinite(size) || size <= 0) return 0;
  return (to - from) / size;
}

/**
 * Dollar value of the position based on lot size, contract size and entry price.
 * For FX/metals this is roughly the notional exposure; for crypto it's just
 * (units × entry).
 */
export function notionalAmount(
  market: MarketType | undefined,
  symbol: string,
  lotSize: number,
  entryPrice: number,
  lotSizeOverride?: number,
): number {
  const contract = lotSizeOverride ?? defaultLotSize(market, symbol);
  if (!Number.isFinite(contract) || contract <= 0) return 0;
  return lotSize * contract * entryPrice;
}

/**
 * Realized $ P&L for an FX-style trade — pips × per-pip-value × lots.
 * Per-pip value at 1 standard lot = pipSize × contractSize (e.g. 0.0001 × 100k = $10/pip for EURUSD).
 */
export function realizedPnL(
  market: MarketType | undefined,
  symbol: string,
  direction: 'long' | 'short' | undefined,
  entryPrice: number,
  exitPrice: number,
  lotSize: number,
  pipSizeOverride?: number,
  lotSizeOverride?: number,
): number {
  const isLong = (direction ?? 'long') === 'long';
  const pip = pipSizeOverride ?? defaultPipSize(market, symbol);
  const contract = lotSizeOverride ?? defaultLotSize(market, symbol);
  if (!Number.isFinite(pip) || pip <= 0) return 0;
  const pipDelta = (exitPrice - entryPrice) / pip;
  const directionalPips = isLong ? pipDelta : -pipDelta;
  const valuePerPipFullLot = pip * contract;
  return directionalPips * valuePerPipFullLot * lotSize;
}

// Exchange rate fetching with localStorage caching
// Base currency: USD — all stored trade amounts are in USD

const CACHE_KEY = 'exchange_rates_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const API_URL = 'https://open.er-api.com/v6/latest/USD';

interface CachedRates {
  rates: Record<string, number>;
  timestamp: number;
}

// Fallback rates (approximate, used when API is unavailable)
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  PHP: 56.2,
  INR: 83.1,
  AUD: 1.53,
  CAD: 1.36,
  CHF: 0.88,
  SGD: 1.34,
  KRW: 1320,
  BRL: 4.97,
  MXN: 17.15,
  ZAR: 18.6,
  NZD: 1.63,
};

function getCached(): CachedRates | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedRates = JSON.parse(raw);
    if (Date.now() - cached.timestamp < CACHE_TTL) return cached;
    return null; // expired
  } catch {
    return null;
  }
}

function setCache(rates: Record<string, number>) {
  if (typeof window === 'undefined') return;
  try {
    const data: CachedRates = { rates, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

let fetchPromise: Promise<Record<string, number>> | null = null;

export async function fetchExchangeRates(): Promise<Record<string, number>> {
  // Return cached if fresh
  const cached = getCached();
  if (cached) return cached.rates;

  // Deduplicate concurrent fetches
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await fetch(API_URL, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.result === 'success' && data.rates) {
        setCache(data.rates);
        return data.rates as Record<string, number>;
      }
      throw new Error('Invalid API response');
    } catch {
      // Try stale cache (even if expired) before falling back
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) {
            const stale: CachedRates = JSON.parse(raw);
            return stale.rates;
          }
        } catch { /* ignore */ }
      }
      return FALLBACK_RATES;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function getRate(rates: Record<string, number>, currencyCode: string): number {
  if (currencyCode === 'USD') return 1;
  return rates[currencyCode] ?? 1;
}

// USD → EUR exchange rate fetcher with 1-hour in-memory cache.
// Uses the Frankfurter API (free, no key required, ECB data).

interface RateCache {
  rate: number;
  expiresAt: number;
}

let _cache: RateCache | null = null;
const TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getUsdEurRate(): Promise<number> {
  const now = Date.now();
  if (_cache && _cache.expiresAt > now) return _cache.rate;

  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR", {
      next: { revalidate: 3600 }, // Next.js ISR hint (ignored outside RSC but harmless)
    });
    if (!res.ok) throw new Error(`Frankfurter API ${res.status}`);
    const json = await res.json() as { rates: { EUR: number } };
    const rate = json.rates.EUR;
    _cache = { rate, expiresAt: now + TTL_MS };
    return rate;
  } catch {
    // Fallback to last cached value if available, otherwise use approximate rate
    if (_cache) return _cache.rate;
    return 0.92; // fallback approximate rate
  }
}

export function invalidateRateCache() {
  _cache = null;
}

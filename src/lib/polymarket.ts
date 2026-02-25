import { PolymarketMarket, OrderBook } from '@/types';

const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

export async function fetchMarkets(params?: {
  limit?: number;
  order?: string;
  ascending?: boolean;
  closed?: boolean;
}): Promise<PolymarketMarket[]> {
  const searchParams = new URLSearchParams({
    closed: String(params?.closed ?? false),
    limit: String(params?.limit ?? 100),
    order: params?.order ?? 'volume',
    ascending: String(params?.ascending ?? false),
  });

  const res = await fetch(`${GAMMA_API}/markets?${searchParams}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch markets: ${res.status}`);
  }

  return res.json();
}

export async function fetchMarket(conditionId: string): Promise<PolymarketMarket | null> {
  const res = await fetch(`${GAMMA_API}/markets?condition_id=${conditionId}`, {
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch market: ${res.status}`);
  }

  const markets = await res.json();
  return markets[0] ?? null;
}

export async function fetchMarketBySlug(slug: string): Promise<PolymarketMarket | null> {
  const res = await fetch(`${GAMMA_API}/markets?slug=${slug}`, {
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch market: ${res.status}`);
  }

  const markets = await res.json();
  return markets[0] ?? null;
}

export async function fetchOrderBook(tokenId: string): Promise<OrderBook | null> {
  try {
    const res = await fetch(`${CLOB_API}/book?token_id=${tokenId}`, {
      next: { revalidate: 10 },
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function parseOutcomePrices(market: PolymarketMarket): { yes: number; no: number } {
  try {
    const prices = JSON.parse(market.outcomePrices);
    return { yes: parseFloat(prices[0]) || 0, no: parseFloat(prices[1]) || 0 };
  } catch {
    return { yes: 0, no: 0 };
  }
}

export function parseClobTokenIds(market: PolymarketMarket): { yes: string; no: string } {
  try {
    const ids = JSON.parse(market.clobTokenIds);
    return { yes: ids[0] ?? '', no: ids[1] ?? '' };
  } catch {
    return { yes: '', no: '' };
  }
}

export function formatPrice(price: number): string {
  return `${(price * 100).toFixed(0)}¢`;
}

export function formatVolume(volume: string | number): string {
  const v = typeof volume === 'string' ? parseFloat(volume) : volume;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

import { KalshiEvent } from '@/types';

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';

interface KalshiEventsResponse {
  events: KalshiEvent[];
  cursor: string;
}

export async function fetchKalshiEvents(limit = 100): Promise<KalshiEvent[]> {
  try {
    const res = await fetch(
      `${KALSHI_API}/events?limit=${limit}&status=open`,
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) {
      console.error(`Kalshi API error: ${res.status}`);
      return [];
    }

    const data: KalshiEventsResponse = await res.json();
    return data.events || [];
  } catch (e) {
    console.error('Failed to fetch Kalshi events:', e);
    return [];
  }
}

export function getKalshiYesPrice(market: { yes_bid: number; yes_ask: number }): number {
  if (market.yes_bid && market.yes_ask) {
    return (market.yes_bid + market.yes_ask) / 200; // midpoint, convert cents to decimal
  }
  if (market.yes_ask) return market.yes_ask / 100;
  if (market.yes_bid) return market.yes_bid / 100;
  return 0;
}

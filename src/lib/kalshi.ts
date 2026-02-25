import { KalshiEvent, KalshiMarket } from '@/types';

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';

interface KalshiEventsResponse {
  events: KalshiEvent[];
  cursor: string;
}

interface KalshiEventDetailResponse {
  event: KalshiEvent;
  markets: KalshiMarket[];
}

export async function fetchKalshiEvents(limit = 50): Promise<KalshiEvent[]> {
  try {
    // Step 1: Get event list
    const res = await fetch(
      `${KALSHI_API}/events?limit=${limit}&status=open`,
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) {
      console.error(`Kalshi events list error: ${res.status}`);
      return [];
    }

    const data: KalshiEventsResponse = await res.json();
    const events = data.events || [];

    // Step 2: Fetch each event's detail to get markets with pricing
    // Limit concurrent requests to avoid rate limiting
    const eventsWithMarkets: KalshiEvent[] = [];
    const batchSize = 10;

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const details = await Promise.allSettled(
        batch.map(e => fetchKalshiEventDetail(e.event_ticker))
      );

      for (const result of details) {
        if (result.status === 'fulfilled' && result.value) {
          eventsWithMarkets.push(result.value);
        }
      }
    }

    return eventsWithMarkets;
  } catch (e) {
    console.error('Failed to fetch Kalshi events:', e);
    return [];
  }
}

async function fetchKalshiEventDetail(eventTicker: string): Promise<KalshiEvent | null> {
  try {
    const res = await fetch(`${KALSHI_API}/events/${eventTicker}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) return null;

    const data: KalshiEventDetailResponse = await res.json();
    return {
      ...data.event,
      markets: data.markets || [],
    };
  } catch {
    return null;
  }
}

// Kalshi prices are in CENTS (0-100), convert to decimal (0-1)
export function getKalshiYesPrice(market: KalshiMarket): number {
  const bid = market.yes_bid || 0;
  const ask = market.yes_ask || 0;

  if (bid && ask) {
    return (bid + ask) / 200; // midpoint of cents, converted to decimal
  }
  if (ask) return ask / 100;
  if (bid) return bid / 100;
  return 0;
}

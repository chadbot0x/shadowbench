import { NextResponse } from 'next/server';

let cached: { data: any; time: number } | null = null;

async function ping(url: string): Promise<{ status: 'up' | 'down'; latency_ms: number }> {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return { status: res.ok ? 'up' : 'down', latency_ms: Date.now() - start };
  } catch {
    return { status: 'down', latency_ms: Date.now() - start };
  }
}

export async function GET() {
  if (cached && Date.now() - cached.time < 30000) {
    return NextResponse.json(cached.data);
  }

  const [polymarket, kalshi] = await Promise.all([
    ping('https://gamma-api.polymarket.com/markets?limit=1'),
    ping('https://api.elections.kalshi.com/trade-api/v2/events?limit=1'),
  ]);

  const data = {
    polymarket,
    kalshi,
    last_check: new Date().toISOString(),
  };

  cached = { data, time: Date.now() };
  return NextResponse.json(data);
}

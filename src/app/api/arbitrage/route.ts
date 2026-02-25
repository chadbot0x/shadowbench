import { NextResponse } from 'next/server';
import { detectArbitrage } from '@/lib/arbitrage';
import type { ScanResult } from '@/types';

let cache: { data: ScanResult; expiry: number } | null = null;

export async function GET() {
  const now = Date.now();

  if (cache && cache.expiry > now) {
    return NextResponse.json(cache.data);
  }

  try {
    const result = await detectArbitrage();
    cache = { data: result, expiry: now + 30000 };
    return NextResponse.json(result);
  } catch (e) {
    console.error('Arbitrage scan failed:', e);
    return NextResponse.json(
      { error: 'Scan failed', opportunities: [], metadata: { scan_time_ms: 0, markets_scanned: 0, matches_found: 0, timestamp: new Date().toISOString() } },
      { status: 500 }
    );
  }
}

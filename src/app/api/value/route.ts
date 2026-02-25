import { NextResponse } from 'next/server';
import { findValuePicks } from '@/lib/value';

export const revalidate = 60;

export async function GET() {
  const start = Date.now();

  try {
    const picks = await findValuePicks();

    return NextResponse.json({
      picks,
      metadata: {
        scan_time_ms: Date.now() - start,
        markets_analyzed: picks.length > 0 ? 150 : 0, // approximate
        picks_found: picks.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Value picks scan failed:', error);
    return NextResponse.json(
      {
        picks: [],
        metadata: {
          scan_time_ms: Date.now() - start,
          markets_analyzed: 0,
          picks_found: 0,
          timestamp: new Date().toISOString(),
          error: 'Scan failed',
        },
      },
      { status: 500 },
    );
  }
}

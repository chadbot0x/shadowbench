import { NextRequest, NextResponse } from 'next/server';
import { getHistory, getLeaderboard } from '@/lib/history';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Check if leaderboard is requested via path or query
  if (searchParams.get('leaderboard') === 'true') {
    return NextResponse.json(getLeaderboard());
  }

  const hours = parseInt(searchParams.get('hours') || '24', 10);
  const entries = getHistory(hours);

  return NextResponse.json({
    hours,
    entries: entries.length,
    history: entries,
  });
}

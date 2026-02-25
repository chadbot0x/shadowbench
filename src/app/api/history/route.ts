import { NextRequest, NextResponse } from 'next/server';
import { getHistory, getLeaderboard, getValueHistory } from '@/lib/history';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Check if leaderboard is requested via path or query
  if (searchParams.get('leaderboard') === 'true') {
    return NextResponse.json(getLeaderboard());
  }

  const hours = Math.max(1, parseInt(searchParams.get('hours') || '24', 10) || 24);
  const entries = getHistory(hours);
  const valuePicks = getValueHistory(hours);

  return NextResponse.json({
    hours,
    entries: entries.length,
    history: entries,
    valuePicks,
  });
}

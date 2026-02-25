import { NextResponse } from 'next/server';

interface SportEvent {
  id: string;
  league: 'NBA' | 'NFL' | 'MLB' | 'NHL';
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: 'scheduled' | 'in_progress' | 'final';
  score?: { home: number; away: number };
  venue?: string;
  broadcast?: string;
  hasPolymarket: boolean;
  hasKalshi: boolean;
  polymarketSlug?: string;
  kalshiTicker?: string;
}

const ESPN_ENDPOINTS: { league: SportEvent['league']; url: string }[] = [
  { league: 'NBA', url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard' },
  { league: 'NFL', url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard' },
  { league: 'MLB', url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard' },
  { league: 'NHL', url: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard' },
];

let cache: { data: any; expiry: number } | null = null;

function parseStatus(espnStatus: string): SportEvent['status'] {
  const s = espnStatus?.toLowerCase() || '';
  if (s === 'in' || s.includes('progress') || s.includes('halftime')) return 'in_progress';
  if (s === 'post' || s === 'final') return 'final';
  return 'scheduled';
}

async function fetchLeague(league: SportEvent['league'], url: string): Promise<SportEvent[]> {
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    const events: SportEvent[] = [];

    for (const event of data?.events || []) {
      const competition = event.competitions?.[0];
      if (!competition) continue;

      const competitors = competition.competitors || [];
      const home = competitors.find((c: any) => c.homeAway === 'home');
      const away = competitors.find((c: any) => c.homeAway === 'away');
      if (!home || !away) continue;

      const statusType = competition.status?.type?.name || event.status?.type?.name || '';
      const status = parseStatus(statusType);

      const score = (status === 'in_progress' || status === 'final') ? {
        home: parseInt(home.score || '0', 10),
        away: parseInt(away.score || '0', 10),
      } : undefined;

      const broadcasts = competition.broadcasts?.flatMap((b: any) => b.names || []) || [];
      const venue = competition.venue;

      events.push({
        id: `${league}-${event.id}`,
        league,
        homeTeam: home.team?.displayName || home.team?.name || 'TBD',
        awayTeam: away.team?.displayName || away.team?.name || 'TBD',
        startTime: event.date || competition.date,
        status,
        score,
        venue: venue ? `${venue.fullName || venue.name}` : undefined,
        broadcast: broadcasts.length > 0 ? broadcasts.join(', ') : undefined,
        hasPolymarket: false,
        hasKalshi: false,
      });
    }
    return events;
  } catch {
    return [];
  }
}

async function checkMarkets(events: SportEvent[]): Promise<void> {
  try {
    const res = await fetch('https://gamma-api.polymarket.com/markets?limit=100&order=volume&ascending=false&closed=false&active=true');
    if (!res.ok) return;
    const markets = await res.json();

    for (const event of events) {
      const homeWords = event.homeTeam.toLowerCase().split(' ');
      const awayWords = event.awayTeam.toLowerCase().split(' ');

      for (const m of markets) {
        const q = (m.question || '').toLowerCase();
        const hasHome = homeWords.some((w: string) => w.length > 3 && q.includes(w));
        const hasAway = awayWords.some((w: string) => w.length > 3 && q.includes(w));
        if (hasHome || hasAway) {
          event.hasPolymarket = true;
          event.polymarketSlug = m.slug;
          break;
        }
      }
    }
  } catch { /* ignore */ }

  try {
    const res = await fetch('https://api.elections.kalshi.com/trade-api/v2/events?limit=50&status=open&series_ticker=&with_nested_markets=true', {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return;
    const data = await res.json();
    const kalshiEvents = data?.events || [];

    for (const event of events) {
      const homeWords = event.homeTeam.toLowerCase().split(' ');
      const awayWords = event.awayTeam.toLowerCase().split(' ');

      for (const ke of kalshiEvents) {
        const title = (ke.title || '').toLowerCase();
        const hasHome = homeWords.some((w: string) => w.length > 3 && title.includes(w));
        const hasAway = awayWords.some((w: string) => w.length > 3 && title.includes(w));
        if (hasHome || hasAway) {
          event.hasKalshi = true;
          event.kalshiTicker = ke.event_ticker;
          break;
        }
      }
    }
  } catch { /* ignore */ }
}

export async function GET() {
  const now = Date.now();
  if (cache && cache.expiry > now) {
    return NextResponse.json(cache.data);
  }

  const results = await Promise.all(
    ESPN_ENDPOINTS.map(ep => fetchLeague(ep.league, ep.url))
  );

  const allEvents = results.flat().sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  await checkMarkets(allEvents);

  const response = {
    events: allEvents,
    metadata: {
      leagues_scanned: ESPN_ENDPOINTS.length,
      events_found: allEvents.length,
      timestamp: new Date().toISOString(),
    },
  };

  cache = { data: response, expiry: now + 60000 };
  return NextResponse.json(response);
}

import { NextResponse } from 'next/server';

interface StatLeader {
  name: string;
  team: string;
  value: string;
  headshot?: string;
}

interface LeagueStats {
  league: string;
  categories: { name: string; displayName: string; leaders: StatLeader[] }[];
}

const STAT_ENDPOINTS = [
  { league: 'NBA', path: 'basketball/nba' },
  { league: 'NFL', path: 'football/nfl' },
  { league: 'MLB', path: 'baseball/mlb' },
  { league: 'NHL', path: 'hockey/nhl' },
];

let cache: { data: any; expiry: number } | null = null;

async function fetchLeagueStats(league: string, path: string): Promise<LeagueStats | null> {
  try {
    // Use the leaders endpoint which is more reliable
    const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/leaders`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();

    const categories: LeagueStats['categories'] = [];

    for (const cat of data?.leaders?.categories || []) {
      const leaders: StatLeader[] = [];
      for (const entry of (cat.leaders || []).slice(0, 10)) {
        const athlete = entry.athlete;
        if (!athlete) continue;
        leaders.push({
          name: athlete.displayName || athlete.shortName || '',
          team: athlete.team?.abbreviation || athlete.team?.displayName || '',
          value: entry.displayValue || String(entry.value || ''),
          headshot: athlete.headshot?.href,
        });
      }
      if (leaders.length > 0) {
        categories.push({
          name: cat.name || cat.abbreviation || '',
          displayName: cat.displayName || cat.name || '',
          leaders,
        });
      }
    }

    // Limit to top 6 categories
    return { league, categories: categories.slice(0, 6) };
  } catch {
    return null;
  }
}

export async function GET() {
  const now = Date.now();
  if (cache && cache.expiry > now) {
    return NextResponse.json(cache.data);
  }

  const results = await Promise.all(
    STAT_ENDPOINTS.map(ep => fetchLeagueStats(ep.league, ep.path))
  );

  const response = {
    leagues: results.filter(Boolean),
    metadata: {
      leagues_scanned: STAT_ENDPOINTS.length,
      timestamp: new Date().toISOString(),
    },
  };

  cache = { data: response, expiry: now + 300000 };
  return NextResponse.json(response);
}

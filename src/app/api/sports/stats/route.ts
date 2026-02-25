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

const LEAGUES = [
  { league: 'NBA', sport: 'basketball', slug: 'nba' },
  { league: 'NFL', sport: 'football', slug: 'nfl' },
  { league: 'MLB', sport: 'baseball', slug: 'mlb' },
  { league: 'NHL', sport: 'hockey', slug: 'nhl' },
];

let cache: { data: any; expiry: number } | null = null;

async function resolveRef(url: string): Promise<any> {
  try {
    const res = await fetch(url.replace('http://', 'https://'), { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchLeagueStats(league: string, sport: string, slug: string): Promise<LeagueStats | null> {
  try {
    const url = `https://sports.core.api.espn.com/v2/sports/${sport}/leagues/${slug}/seasons/2026/types/2/leaders?limit=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();

    const rawCategories = (data?.categories || []).slice(0, 6);
    const categories: LeagueStats['categories'] = [];

    for (const cat of rawCategories) {
      const rawLeaders = (cat.leaders || []).slice(0, 5);
      
      // Resolve athlete refs in parallel
      const resolved = await Promise.all(
        rawLeaders.map(async (entry: any) => {
          const athleteRef = entry?.athlete?.$ref || entry?.athlete?.['$ref'];
          const teamRef = entry?.team?.$ref || entry?.team?.['$ref'];
          
          const [athlete, team] = await Promise.all([
            athleteRef ? resolveRef(athleteRef) : Promise.resolve(null),
            teamRef ? resolveRef(teamRef) : Promise.resolve(null),
          ]);

          return {
            name: athlete?.displayName || athlete?.shortName || 'Unknown',
            team: team?.abbreviation || team?.displayName || '',
            value: entry.displayValue || String(entry.value || ''),
            headshot: athlete?.headshot?.href,
          };
        })
      );

      categories.push({
        name: cat.name || cat.abbreviation || '',
        displayName: cat.displayName || cat.name || '',
        leaders: resolved.filter((l: StatLeader) => l.name !== 'Unknown'),
      });
    }

    return categories.length > 0 ? { league, categories } : null;
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
    LEAGUES.map(l => fetchLeagueStats(l.league, l.sport, l.slug))
  );

  const response = {
    leagues: results.filter(Boolean),
    metadata: {
      leagues_scanned: LEAGUES.length,
      leagues_with_data: results.filter(Boolean).length,
      timestamp: new Date().toISOString(),
    },
  };

  // Cache for 5 minutes
  cache = { data: response, expiry: now + 300000 };
  return NextResponse.json(response);
}

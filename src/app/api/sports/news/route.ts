import { NextResponse } from 'next/server';

interface SportsArticle {
  id: string;
  headline: string;
  description: string;
  published: string;
  league: string;
  link: string;
  image?: string;
}

const NEWS_ENDPOINTS = [
  { league: 'NBA', url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news?limit=10' },
  { league: 'NFL', url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=10' },
  { league: 'MLB', url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/news?limit=10' },
  { league: 'NHL', url: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/news?limit=10' },
];

let cache: { data: any; expiry: number } | null = null;

async function fetchNews(league: string, url: string): Promise<SportsArticle[]> {
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.articles || []).map((a: any) => ({
      id: `${league}-${a.dataSourceIdentifier || a.headline?.slice(0, 20)}`,
      headline: a.headline || '',
      description: a.description || '',
      published: a.published || '',
      league,
      link: a.links?.web?.href || a.links?.api?.self?.href || '#',
      image: a.images?.[0]?.url,
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  const now = Date.now();
  if (cache && cache.expiry > now) {
    return NextResponse.json(cache.data);
  }

  const results = await Promise.all(
    NEWS_ENDPOINTS.map(ep => fetchNews(ep.league, ep.url))
  );

  const articles = results.flat()
    .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
    .slice(0, 15);

  const response = {
    articles,
    metadata: {
      sources_scanned: NEWS_ENDPOINTS.length,
      articles_found: articles.length,
      timestamp: new Date().toISOString(),
    },
  };

  cache = { data: response, expiry: now + 300000 };
  return NextResponse.json(response);
}

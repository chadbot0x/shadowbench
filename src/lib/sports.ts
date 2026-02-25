import { ArbitrageOpportunity, ScanResult } from '@/types';
import { fetchMarkets, parseOutcomePrices } from './polymarket';
import { fetchKalshiEvents, getKalshiYesPrice } from './kalshi';

const SPORTS_KEYWORDS = ['sports', 'nba', 'nfl', 'mlb', 'nhl', 'soccer', 'mls', 'ufc', 'boxing', 'tennis', 'golf'];

const TEAM_ALIASES: Record<string, string[]> = {
  // NBA
  'Lakers': ['LAL', 'Los Angeles Lakers', 'LA Lakers'],
  'Celtics': ['BOS', 'Boston Celtics'],
  'Warriors': ['GSW', 'Golden State Warriors', 'GS Warriors'],
  'Bucks': ['MIL', 'Milwaukee Bucks'],
  'Nuggets': ['DEN', 'Denver Nuggets'],
  '76ers': ['PHI', 'Philadelphia 76ers', 'Sixers'],
  'Heat': ['MIA', 'Miami Heat'],
  'Suns': ['PHX', 'Phoenix Suns'],
  'Mavericks': ['DAL', 'Dallas Mavericks', 'Mavs'],
  'Knicks': ['NYK', 'New York Knicks', 'NY Knicks'],
  // NFL
  'Chiefs': ['KC', 'Kansas City Chiefs'],
  'Eagles': ['PHI', 'Philadelphia Eagles'],
  'Bills': ['BUF', 'Buffalo Bills'],
  '49ers': ['SF', 'San Francisco 49ers', 'Niners'],
  'Cowboys': ['DAL', 'Dallas Cowboys'],
  'Ravens': ['BAL', 'Baltimore Ravens'],
  'Lions': ['DET', 'Detroit Lions'],
  'Dolphins': ['MIA', 'Miami Dolphins'],
  'Packers': ['GB', 'Green Bay Packers'],
  'Bengals': ['CIN', 'Cincinnati Bengals'],
  // MLB
  'Yankees': ['NYY', 'New York Yankees', 'NY Yankees'],
  'Dodgers': ['LAD', 'Los Angeles Dodgers', 'LA Dodgers'],
  'Braves': ['ATL', 'Atlanta Braves'],
  'Astros': ['HOU', 'Houston Astros'],
  'Red Sox': ['BOS', 'Boston Red Sox'],
  // NHL
  'Oilers': ['EDM', 'Edmonton Oilers'],
  'Panthers': ['FLA', 'Florida Panthers'],
  'Avalanche': ['COL', 'Colorado Avalanche'],
  'Rangers': ['NYR', 'New York Rangers'],
  'Bruins': ['BOS', 'Boston Bruins'],
};

// Build reverse lookup: any alias -> canonical name
const ALIAS_MAP = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(TEAM_ALIASES)) {
  ALIAS_MAP.set(canonical.toLowerCase(), canonical.toLowerCase());
  for (const alias of aliases) {
    ALIAS_MAP.set(alias.toLowerCase(), canonical.toLowerCase());
  }
}

function normalizeSports(text: string): string {
  let normalized = text.toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Replace known aliases with canonical names
  for (const [alias, canonical] of ALIAS_MAP) {
    if (normalized.includes(alias) && alias !== canonical) {
      normalized = normalized.replace(alias, canonical);
    }
  }

  // Normalize "vs" variants
  normalized = normalized.replace(/\b(versus|v\.?s\.?|vs)\b/g, 'vs');

  return normalized;
}

function sportsSimilarity(a: string, b: string): number {
  const na = normalizeSports(a);
  const nb = normalizeSports(b);
  if (na === nb) return 1;

  // Bigram Dice coefficient
  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };

  const ba = bigrams(na);
  const bb = bigrams(nb);
  if (ba.size === 0 || bb.size === 0) return 0;
  let intersection = 0;
  for (const bg of ba) if (bb.has(bg)) intersection++;
  return (2 * intersection) / (ba.size + bb.size);
}

function isSportsCategory(cat: string): boolean {
  const lower = cat.toLowerCase();
  return SPORTS_KEYWORDS.some(kw => lower.includes(kw));
}

export async function detectSportsArbitrage(): Promise<ScanResult> {
  const start = Date.now();

  const [polymarkets, kalshiEvents] = await Promise.all([
    fetchMarkets({ limit: 100, order: 'volume', ascending: false, closed: false }),
    fetchKalshiEvents(50),
  ]);

  // Filter to sports only
  const sportsPolymarkets = polymarkets.filter(pm => isSportsCategory(pm.category || ''));
  const sportsKalshi = kalshiEvents.filter(e => isSportsCategory(e.category || ''));

  const opportunities: ArbitrageOpportunity[] = [];
  let idCounter = 0;

  for (const pm of sportsPolymarkets) {
    const pmPrices = parseOutcomePrices(pm);
    if (!pmPrices.yes || pmPrices.yes <= 0.01 || pmPrices.yes >= 0.99) continue;
    const pmVol = parseFloat(pm.volume || '0');

    for (const event of sportsKalshi) {
      for (const km of event.markets || []) {
        const kalshiPrice = getKalshiYesPrice(km);
        if (!kalshiPrice || kalshiPrice <= 0.01 || kalshiPrice >= 0.99) continue;

        const matchScore = Math.max(
          sportsSimilarity(pm.question, event.title),
          sportsSimilarity(pm.question, km.title || ''),
          km.subtitle ? sportsSimilarity(pm.question, km.subtitle) : 0
        );

        if (matchScore < 0.5) continue;

        const spread = Math.abs(pmPrices.yes - kalshiPrice);
        const cheaperPrice = Math.min(pmPrices.yes, kalshiPrice);
        const spreadPercent = (spread / cheaperPrice) * 100;

        if (spreadPercent < 2 || spreadPercent > 100) continue;

        const [cheapPlatform, cheapPrice, expPlatform, expPrice] =
          pmPrices.yes < kalshiPrice
            ? ['Polymarket', pmPrices.yes, 'Kalshi', kalshiPrice]
            : ['Kalshi', kalshiPrice, 'Polymarket', pmPrices.yes];

        const kalshiVol = km.volume || 0;

        opportunities.push({
          id: `sports-${++idCounter}`,
          event: pm.question,
          type: 'cross-platform',
          platformA: cheapPlatform,
          platformAPrice: cheapPrice,
          platformB: expPlatform,
          platformBPrice: expPrice,
          spread,
          spreadPercent,
          category: pm.category || event.category || 'Sports',
          confidence: matchScore > 0.8 && spreadPercent > 3 ? 'high' : matchScore > 0.6 ? 'medium' : 'low',
          potentialProfit: 100 * spread,
          requiredCapital: 100,
          matchScore,
          volumeA: cheapPlatform === 'Polymarket' ? pmVol : kalshiVol,
          volumeB: cheapPlatform === 'Polymarket' ? kalshiVol : pmVol,
          details: `Sports arb: Buy YES on ${cheapPlatform} at ${(cheapPrice * 100).toFixed(1)}¢, sell on ${expPlatform} at ${(expPrice * 100).toFixed(1)}¢`,
        });
      }
    }
  }

  opportunities.sort((a, b) => b.spreadPercent - a.spreadPercent);
  const topOpps = opportunities.slice(0, 50);
  const kalshiMarketCount = sportsKalshi.reduce((s, e) => s + (e.markets?.length || 0), 0);

  return {
    opportunities: topOpps,
    metadata: {
      scan_time_ms: Date.now() - start,
      markets_scanned: sportsPolymarkets.length + kalshiMarketCount,
      matches_found: topOpps.length,
      timestamp: new Date().toISOString(),
    },
  };
}

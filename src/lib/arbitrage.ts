import { PolymarketMarket, ArbitrageOpportunity, KalshiEvent, ScanResult } from '@/types';
import { fetchMarkets, parseOutcomePrices } from './polymarket';
import { fetchKalshiEvents, getKalshiYesPrice } from './kalshi';

// Simple fuzzy string similarity (Dice coefficient on bigrams)
function similarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;

  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };

  const ba = bigrams(na);
  const bb = bigrams(nb);
  let intersection = 0;
  for (const b of ba) if (bb.has(b)) intersection++;
  return ba.size + bb.size === 0 ? 0 : (2 * intersection) / (ba.size + bb.size);
}

function getConfidence(spread: number, volumeA: number, volumeB: number): 'high' | 'medium' | 'low' {
  const totalVol = volumeA + volumeB;
  if (spread > 0.1 && totalVol > 100000) return 'high';
  if (spread > 0.05 || totalVol > 50000) return 'medium';
  return 'low';
}

export async function detectArbitrage(): Promise<ScanResult> {
  const start = Date.now();

  const [polymarkets, kalshiEvents] = await Promise.all([
    fetchMarkets({ limit: 100, order: 'volume', ascending: false, closed: false }),
    fetchKalshiEvents(100),
  ]);

  const opportunities: ArbitrageOpportunity[] = [];
  let idCounter = 0;

  // Cross-platform matching
  for (const pm of polymarkets) {
    const pmPrices = parseOutcomePrices(pm);
    if (!pmPrices.yes || pmPrices.yes <= 0 || pmPrices.yes >= 1) continue;

    const pmVol = parseFloat(pm.volume || '0');

    for (const event of kalshiEvents) {
      for (const km of event.markets || []) {
        const kalshiPrice = getKalshiYesPrice(km);
        if (!kalshiPrice || kalshiPrice <= 0 || kalshiPrice >= 1) continue;

        // Try matching question to event/market title
        const matchScore = Math.max(
          similarity(pm.question, event.title),
          similarity(pm.question, km.title),
          km.subtitle ? similarity(pm.question, km.subtitle) : 0
        );

        if (matchScore < 0.35) continue;

        const spread = Math.abs(pmPrices.yes - kalshiPrice);
        const spreadPercent = (spread / Math.min(pmPrices.yes, kalshiPrice)) * 100;

        if (spreadPercent < 1) continue;

        const [cheapPlatform, cheapPrice, expPlatform, expPrice] =
          pmPrices.yes < kalshiPrice
            ? ['Polymarket', pmPrices.yes, 'Kalshi', kalshiPrice]
            : ['Kalshi', kalshiPrice, 'Polymarket', pmPrices.yes];

        const requiredCapital = 100;
        const potentialProfit = requiredCapital * spread;
        const kalshiVol = km.volume || 0;

        opportunities.push({
          id: `cross-${++idCounter}`,
          event: pm.question,
          type: 'cross-platform',
          platformA: cheapPlatform,
          platformAPrice: cheapPrice,
          platformB: expPlatform,
          platformBPrice: expPrice,
          spread,
          spreadPercent,
          category: pm.category || event.category || 'Other',
          confidence: getConfidence(spread, pmVol, kalshiVol),
          potentialProfit,
          requiredCapital,
          matchScore,
          volumeA: cheapPlatform === 'Polymarket' ? pmVol : kalshiVol,
          volumeB: cheapPlatform === 'Polymarket' ? kalshiVol : pmVol,
          details: `Buy YES on ${cheapPlatform} at ${(cheapPrice * 100).toFixed(1)}¢, sell YES on ${expPlatform} at ${(expPrice * 100).toFixed(1)}¢. Match confidence: ${(matchScore * 100).toFixed(0)}%`,
        });
      }
    }
  }

  // Intra-market arbs: multi-outcome Polymarket events where YES prices don't sum to ~100%
  // Group by groupItemTitle patterns (markets with same base question)
  const grouped = new Map<string, PolymarketMarket[]>();
  for (const m of polymarkets) {
    // Use description or slug prefix as grouping key
    const key = m.groupItemTitle || m.question;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }

  // Also check individual markets where YES + NO don't sum to ~1
  for (const pm of polymarkets) {
    const prices = parseOutcomePrices(pm);
    if (!prices.yes || !prices.no) continue;
    const sum = prices.yes + prices.no;
    if (sum < 0.95) {
      // Gap exists - buying both YES and NO costs less than $1 but one must pay $1
      const spread = 1 - sum;
      const spreadPercent = spread * 100;
      if (spreadPercent < 1) continue;

      const pmVol = parseFloat(pm.volume || '0');
      opportunities.push({
        id: `intra-${++idCounter}`,
        event: pm.question,
        type: 'intra-market',
        platformA: 'Polymarket YES',
        platformAPrice: prices.yes,
        platformB: 'Polymarket NO',
        platformBPrice: prices.no,
        spread,
        spreadPercent,
        category: pm.category || 'Other',
        confidence: getConfidence(spread, pmVol, pmVol),
        potentialProfit: 100 * spread,
        requiredCapital: 100,
        matchScore: 1,
        volumeA: pmVol,
        volumeB: pmVol,
        details: `YES (${(prices.yes * 100).toFixed(1)}¢) + NO (${(prices.no * 100).toFixed(1)}¢) = ${(sum * 100).toFixed(1)}¢. Buy both for guaranteed ${(spread * 100).toFixed(1)}¢ profit per share.`,
      });
    }
  }

  // Sort by spread descending
  opportunities.sort((a, b) => b.spreadPercent - a.spreadPercent);

  return {
    opportunities,
    metadata: {
      scan_time_ms: Date.now() - start,
      markets_scanned: polymarkets.length + kalshiEvents.reduce((s, e) => s + (e.markets?.length || 0), 0),
      matches_found: opportunities.length,
      timestamp: new Date().toISOString(),
    },
  };
}

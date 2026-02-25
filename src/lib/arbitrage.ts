import { PolymarketMarket, ArbitrageOpportunity, KalshiEvent, ScanResult } from '@/types';
import { fetchMarkets, parseOutcomePrices } from './polymarket';
import { fetchKalshiEvents, getKalshiYesPrice } from './kalshi';

// Fuzzy string similarity (Dice coefficient on bigrams)
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
  if (ba.size === 0 || bb.size === 0) return 0;
  let intersection = 0;
  for (const bg of ba) if (bb.has(bg)) intersection++;
  return (2 * intersection) / (ba.size + bb.size);
}

function getConfidence(
  spreadPercent: number,
  volumeA: number,
  volumeB: number,
  matchScore: number
): 'high' | 'medium' | 'low' {
  // High confidence: tight match, real volume, meaningful spread
  if (matchScore > 0.8 && spreadPercent > 3 && volumeA > 10000 && volumeB > 1000) return 'high';
  if (matchScore > 0.6 && spreadPercent > 2 && (volumeA + volumeB) > 5000) return 'medium';
  return 'low';
}

export async function detectArbitrage(): Promise<ScanResult> {
  const start = Date.now();

  const [polymarkets, kalshiEvents] = await Promise.all([
    fetchMarkets({ limit: 100, order: 'volume', ascending: false, closed: false }),
    fetchKalshiEvents(50), // Reduced — each event requires a detail fetch
  ]);

  const opportunities: ArbitrageOpportunity[] = [];
  let idCounter = 0;

  const kalshiMarketCount = kalshiEvents.reduce((s, e) => s + (e.markets?.length || 0), 0);

  // Cross-platform matching
  for (const pm of polymarkets) {
    const pmPrices = parseOutcomePrices(pm);
    // Must have valid YES price in (0.01, 0.99) range
    if (!pmPrices.yes || pmPrices.yes <= 0.01 || pmPrices.yes >= 0.99) continue;

    const pmVol = parseFloat(pm.volume || '0');

    for (const event of kalshiEvents) {
      for (const km of event.markets || []) {
        const kalshiPrice = getKalshiYesPrice(km);
        // Must have valid Kalshi price
        if (!kalshiPrice || kalshiPrice <= 0.01 || kalshiPrice >= 0.99) continue;

        // Match quality: require HIGH similarity (0.65+) to avoid false positives
        const matchScore = Math.max(
          similarity(pm.question, event.title),
          similarity(pm.question, km.title || ''),
          km.subtitle ? similarity(pm.question, km.subtitle) : 0
        );

        if (matchScore < 0.55) continue;

        const spread = Math.abs(pmPrices.yes - kalshiPrice);
        // Spread as % of the cheaper price
        const cheaperPrice = Math.min(pmPrices.yes, kalshiPrice);
        const spreadPercent = (spread / cheaperPrice) * 100;

        // Minimum 2% spread to be worth showing
        if (spreadPercent < 2) continue;

        // Cap spread at 100% — anything higher is likely a bad match
        if (spreadPercent > 100) continue;

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
          confidence: getConfidence(spreadPercent, pmVol, kalshiVol, matchScore),
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

  // Intra-market arbs: YES + NO prices don't sum to ~100%
  for (const pm of polymarkets) {
    const prices = parseOutcomePrices(pm);
    if (!prices.yes || !prices.no) continue;
    // Both prices must be meaningful
    if (prices.yes < 0.01 || prices.no < 0.01) continue;

    const sum = prices.yes + prices.no;
    if (sum < 0.95) {
      // Gap: buying both YES and NO costs less than $1 but one must pay $1
      const spread = 1 - sum;
      const spreadPercent = spread * 100;
      if (spreadPercent < 2) continue; // Need at least 2% to be meaningful

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
        confidence: getConfidence(spreadPercent, pmVol, pmVol, 1),
        potentialProfit: 100 * spread,
        requiredCapital: 100,
        matchScore: 1,
        volumeA: pmVol,
        volumeB: pmVol,
        details: `YES (${(prices.yes * 100).toFixed(1)}¢) + NO (${(prices.no * 100).toFixed(1)}¢) = ${(sum * 100).toFixed(1)}¢. Buy both for guaranteed ${(spread * 100).toFixed(1)}¢ profit per share.`,
      });
    }
  }

  // Sort by spread descending, cap at top 50 results
  opportunities.sort((a, b) => b.spreadPercent - a.spreadPercent);
  const topOpps = opportunities.slice(0, 50);

  return {
    opportunities: topOpps,
    metadata: {
      scan_time_ms: Date.now() - start,
      markets_scanned: polymarkets.length + kalshiMarketCount,
      matches_found: topOpps.length,
      timestamp: new Date().toISOString(),
    },
  };
}

import { PolymarketMarket, KalshiEvent, KalshiMarket } from '@/types';
import { fetchMarkets, parseOutcomePrices } from './polymarket';
import { fetchKalshiEvents, getKalshiYesPrice } from './kalshi';
import { polymarketLink, kalshiLink } from './links';

export interface ValuePick {
  id: string;
  market: string;
  platform: 'Polymarket' | 'Kalshi';
  currentPrice: number;
  estimatedFairValue: number;
  ev: number;
  evPercent: number;
  direction: 'buy_yes' | 'buy_no' | 'fade';
  category: string;
  confidence: 'high' | 'medium' | 'low';
  thesis: string;
  volume: number;
  deepLink: string;
  detectedAt: string;
}

// Fuzzy string similarity (Dice coefficient)
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

function categorize(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('sport') || c.includes('nba') || c.includes('nfl') || c.includes('mlb') || c.includes('soccer') || c.includes('football')) return 'Sports';
  if (c.includes('politic') || c.includes('election') || c.includes('president') || c.includes('congress')) return 'Politics';
  if (c.includes('crypto') || c.includes('bitcoin') || c.includes('btc') || c.includes('eth')) return 'Crypto';
  return 'World';
}

function getConfidence(
  crossPlatform: boolean,
  volumeTotal: number,
  evPercent: number,
): 'high' | 'medium' | 'low' {
  if (crossPlatform && volumeTotal > 50000 && Math.abs(evPercent) > 10) return 'high';
  if (crossPlatform && volumeTotal > 10000 && Math.abs(evPercent) > 5) return 'medium';
  if (volumeTotal > 5000) return 'medium';
  return 'low';
}

function generateThesis(
  direction: 'buy_yes' | 'buy_no' | 'fade',
  platform: 'Polymarket' | 'Kalshi',
  currentPrice: number,
  fairValue: number,
  otherPlatform: string,
  otherPrice: number,
): string {
  const cur = (currentPrice * 100).toFixed(0);
  const fair = (fairValue * 100).toFixed(0);
  const other = (otherPrice * 100).toFixed(0);

  if (otherPlatform) {
    const gap = Math.abs(currentPrice - otherPrice) * 100;
    const cheaper = currentPrice < otherPrice ? platform : otherPlatform;
    return `${otherPlatform} prices this at ${other}¢ while ${platform} has ${cur}¢. The ${gap.toFixed(0)}¢ gap suggests ${cheaper} is undervalued.`;
  }

  if (direction === 'buy_yes') {
    return `Market implies ${cur}% chance, but cross-reference data suggests ${fair}%. Potential value on YES.`;
  }
  return `Market implies ${cur}% chance, but fair value estimate is ${fair}%. Consider fading this position.`;
}

export async function findValuePicks(): Promise<ValuePick[]> {
  const [polymarkets, kalshiEvents] = await Promise.all([
    fetchMarkets({ limit: 100, order: 'volume', ascending: false, closed: false }),
    fetchKalshiEvents(50),
  ]);

  const picks: ValuePick[] = [];
  let idCounter = 0;
  const now = new Date().toISOString();

  // Build a flat list of Kalshi markets with their event info
  const kalshiFlat: { event: KalshiEvent; market: KalshiMarket; price: number }[] = [];
  for (const event of kalshiEvents) {
    for (const km of event.markets || []) {
      const price = getKalshiYesPrice(km);
      if (price > 0.01 && price < 0.99) {
        kalshiFlat.push({ event, market: km, price });
      }
    }
  }

  // Cross-platform: find matching markets and use price disagreement
  for (const pm of polymarkets) {
    const pmPrices = parseOutcomePrices(pm);
    if (!pmPrices.yes || pmPrices.yes <= 0.01 || pmPrices.yes >= 0.99) continue;

    const pmVol = parseFloat(pm.volume || '0');
    const cat = categorize(pm.category || '');

    for (const { event: kEvent, market: km, price: kalshiPrice } of kalshiFlat) {
      const matchScore = Math.max(
        similarity(pm.question, kEvent.title),
        similarity(pm.question, km.title || ''),
        km.subtitle ? similarity(pm.question, km.subtitle) : 0,
      );

      if (matchScore < 0.55) continue;

      // Fair value = average of both platforms
      const fairValue = (pmPrices.yes + kalshiPrice) / 2;
      const kalshiVol = km.volume || 0;

      // Check Polymarket side: is it underpriced?
      const pmEv = fairValue - pmPrices.yes;
      const pmEvPercent = (pmEv / pmPrices.yes) * 100;

      if (Math.abs(pmEvPercent) > 5) {
        const direction: 'buy_yes' | 'buy_no' | 'fade' = pmEv > 0 ? 'buy_yes' : 'fade';
        picks.push({
          id: `val-${++idCounter}`,
          market: pm.question,
          platform: 'Polymarket',
          currentPrice: pmPrices.yes,
          estimatedFairValue: fairValue,
          ev: pmEv,
          evPercent: pmEvPercent,
          direction,
          category: cat,
          confidence: getConfidence(true, pmVol + kalshiVol, pmEvPercent),
          thesis: generateThesis(direction, 'Polymarket', pmPrices.yes, fairValue, 'Kalshi', kalshiPrice),
          volume: pmVol,
          deepLink: polymarketLink({ slug: pm.slug, conditionId: pm.conditionId }),
          detectedAt: now,
        });
      }

      // Check Kalshi side: is it underpriced?
      const kEv = fairValue - kalshiPrice;
      const kEvPercent = (kEv / kalshiPrice) * 100;

      if (Math.abs(kEvPercent) > 5) {
        const direction: 'buy_yes' | 'buy_no' | 'fade' = kEv > 0 ? 'buy_yes' : 'fade';
        picks.push({
          id: `val-${++idCounter}`,
          market: km.title || kEvent.title,
          platform: 'Kalshi',
          currentPrice: kalshiPrice,
          estimatedFairValue: fairValue,
          ev: kEv,
          evPercent: kEvPercent,
          direction,
          category: cat,
          confidence: getConfidence(true, pmVol + kalshiVol, kEvPercent),
          thesis: generateThesis(direction, 'Kalshi', kalshiPrice, fairValue, 'Polymarket', pmPrices.yes),
          volume: kalshiVol,
          deepLink: kalshiLink({ event_ticker: kEvent.event_ticker, ticker: km.ticker }),
          detectedAt: now,
        });
      }
    }
  }

  // Intra-market: Polymarket YES+NO doesn't sum to 1 → implied value gap
  for (const pm of polymarkets) {
    const prices = parseOutcomePrices(pm);
    if (!prices.yes || !prices.no || prices.yes < 0.01 || prices.no < 0.01) continue;

    const sum = prices.yes + prices.no;
    const pmVol = parseFloat(pm.volume || '0');
    const cat = categorize(pm.category || '');

    // If YES + NO < 0.95, there's free money (buy both)
    // But for value picks, we look at individual mispricing
    // If sum < 1: both are underpriced relative to true probabilities
    // Fair value of YES ≈ prices.yes / sum (normalized)
    if (Math.abs(sum - 1) > 0.03) {
      const fairYes = prices.yes / sum;
      const evYes = fairYes - prices.yes;
      const evYesPercent = (evYes / prices.yes) * 100;

      if (evYesPercent > 5) {
        picks.push({
          id: `val-${++idCounter}`,
          market: pm.question,
          platform: 'Polymarket',
          currentPrice: prices.yes,
          estimatedFairValue: fairYes,
          ev: evYes,
          evPercent: evYesPercent,
          direction: 'buy_yes',
          category: cat,
          confidence: getConfidence(false, pmVol, evYesPercent),
          thesis: `YES + NO = ${(sum * 100).toFixed(0)}¢ (should be ~100¢). YES at ${(prices.yes * 100).toFixed(0)}¢ is underpriced — normalized fair value is ${(fairYes * 100).toFixed(0)}¢.`,
          volume: pmVol,
          deepLink: polymarketLink({ slug: pm.slug, conditionId: pm.conditionId }),
          detectedAt: now,
        });
      }

      const fairNo = prices.no / sum;
      const evNo = fairNo - prices.no;
      const evNoPercent = (evNo / prices.no) * 100;

      if (evNoPercent > 5) {
        picks.push({
          id: `val-${++idCounter}`,
          market: pm.question,
          platform: 'Polymarket',
          currentPrice: prices.no,
          estimatedFairValue: fairNo,
          ev: evNo,
          evPercent: evNoPercent,
          direction: 'buy_no',
          category: cat,
          confidence: getConfidence(false, pmVol, evNoPercent),
          thesis: `YES + NO = ${(sum * 100).toFixed(0)}¢ (should be ~100¢). NO at ${(prices.no * 100).toFixed(0)}¢ is underpriced — normalized fair value is ${(fairNo * 100).toFixed(0)}¢.`,
          volume: pmVol,
          deepLink: polymarketLink({ slug: pm.slug, conditionId: pm.conditionId }),
          detectedAt: now,
        });
      }
    }
  }

  // Sort by absolute EV% descending
  picks.sort((a, b) => Math.abs(b.evPercent) - Math.abs(a.evPercent));

  // Deduplicate: keep best pick per market question
  const seen = new Map<string, ValuePick>();
  for (const pick of picks) {
    const key = pick.market.toLowerCase().slice(0, 60);
    const existing = seen.get(key);
    if (!existing || Math.abs(pick.evPercent) > Math.abs(existing.evPercent)) {
      seen.set(key, pick);
    }
  }

  return Array.from(seen.values()).slice(0, 50);
}

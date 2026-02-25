export function polymarketLink(market: { conditionId?: string; slug?: string; question?: string }): string {
  if (market.slug) return `https://polymarket.com/event/${market.slug}`;
  if (market.conditionId) return `https://polymarket.com/event/${market.conditionId}`;
  return 'https://polymarket.com';
}

export function kalshiLink(market: { event_ticker?: string; ticker?: string }): string {
  if (market.event_ticker) return `https://kalshi.com/markets/${market.event_ticker.toLowerCase()}`;
  if (market.ticker) return `https://kalshi.com/markets/${market.ticker.toLowerCase()}`;
  return 'https://kalshi.com';
}

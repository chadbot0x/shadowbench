export function polymarketLink(market: { conditionId?: string; slug?: string; question?: string }): string {
  if (market.slug) return `https://polymarket.com/event/${market.slug}`;
  if (market.conditionId) return `https://polymarket.com/event/${market.conditionId}`;
  return 'https://polymarket.com';
}

export function kalshiLink(market: { event_ticker?: string; ticker?: string }): string {
  // Kalshi uses /browse/ for event pages; strip the contract suffix (e.g. -70) for the event URL
  if (market.event_ticker) {
    const base = market.event_ticker.replace(/-\d+$/, '').toLowerCase();
    return `https://kalshi.com/browse/${base}`;
  }
  if (market.ticker) {
    const base = market.ticker.replace(/-\d+$/, '').toLowerCase();
    return `https://kalshi.com/browse/${base}`;
  }
  return 'https://kalshi.com/browse';
}

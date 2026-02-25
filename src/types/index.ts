export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  resolutionSource: string;
  endDate: string;
  liquidity: string;
  volume: string;
  volume24hr: string;
  active: boolean;
  closed: boolean;
  marketMakerAddress: string;
  outcomePrices: string; // JSON string of [yesPrice, noPrice]
  outcomes: string; // JSON string of ["Yes", "No"]
  clobTokenIds: string; // JSON string of [yesTokenId, noTokenId]
  category: string;
  image: string;
  icon: string;
  description: string;
}

export interface OrderBookOrder {
  price: string;
  size: string;
}

export interface OrderBook {
  market: string;
  asset_id: string;
  bids: OrderBookOrder[];
  asks: OrderBookOrder[];
  timestamp: string;
}

export interface Position {
  id: string;
  market: string;
  side: 'YES' | 'NO';
  entry: number;
  current: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  platform: 'Polymarket' | 'Kalshi';
}

export interface ArbitrageOpportunity {
  id: string;
  event: string;
  platformA: string;
  platformAPrice: number;
  platformB: string;
  platformBPrice: number;
  spread: number;
  spreadPercent: number;
  category: string;
}

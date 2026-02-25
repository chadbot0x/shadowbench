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
  outcomePrices: string;
  outcomes: string;
  clobTokenIds: string;
  category: string;
  image: string;
  icon: string;
  description: string;
  groupItemTitle?: string;
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

export interface WatchlistItem {
  id: string;
  type: 'market' | 'arbitrage';
  addedAt: number;
  data: any;
}

export interface KalshiEvent {
  event_ticker: string;
  series_ticker: string;
  title: string;
  category: string;
  markets: KalshiMarket[];
  mutually_exclusive: boolean;
}

export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  title: string;
  subtitle: string;
  status: string;
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  volume: number;
  volume_24h: number;
  open_interest: number;
  result: string;
  category: string;
}

export interface ArbitrageOpportunity {
  id: string;
  event: string;
  type: 'cross-platform' | 'intra-market';
  platformA: string;
  platformAPrice: number;
  platformB: string;
  platformBPrice: number;
  spread: number;
  spreadPercent: number;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  potentialProfit: number;
  requiredCapital: number;
  matchScore: number;
  volumeA?: number;
  volumeB?: number;
  details?: string;
}

export interface ScanResult {
  opportunities: ArbitrageOpportunity[];
  metadata: {
    scan_time_ms: number;
    markets_scanned: number;
    matches_found: number;
    timestamp: string;
  };
}

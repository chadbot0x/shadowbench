# ShadowBench — Architecture & Build Plan

## What Is It
A cross-platform prediction market trading terminal. Users see real-time markets across Polymarket and Kalshi, detect arbitrage opportunities, and execute trades directly from connected accounts.

Think: Bloomberg Terminal meets prediction markets. Dark, fast, professional.

## Tech Stack
- **Frontend:** Next.js 15 (App Router) + TailwindCSS + shadcn/ui
- **Real-time:** WebSocket connections to Polymarket CLOB + Kalshi
- **Backend API:** Next.js API routes (keeps it simple, one deploy)
- **Database:** SQLite via better-sqlite3 (market cache, user prefs, trade history)
- **Auth:** Wallet-based (Polymarket = Ethereum wallet, Kalshi = API key)
- **Trading:** py-clob-client (Polymarket), Kalshi REST API
- **Deployment:** Vercel (frontend) + our Mac (trading backend via API)

## Core Features (MVP)

### 1. Market Explorer
- Browse all active markets across Polymarket + Kalshi
- Filter by category (politics, crypto, sports, entertainment)
- Search with autocomplete
- Sort by volume, end date, price movement
- Real-time price updates via WebSocket

### 2. Arbitrage Scanner
- Cross-platform: same event priced differently on Poly vs Kalshi
- Intra-market: multi-outcome markets where probabilities don't sum to 100%
- Display: profit %, required capital, risk-free vs directional
- Alerts: push notification when arb exceeds threshold
- Historical arb tracking (what opportunities appeared and how they resolved)

### 3. Market Detail View
- Full order book visualization (depth chart)
- Price history chart (candlestick + line)
- Volume over time
- Related markets
- AI-generated market summary (what's driving the price?)
- Comments/analysis from the community

### 4. Trading Terminal
- Connect Polymarket wallet (MetaMask/WalletConnect or private key)
- Connect Kalshi account (API credentials)
- Place market/limit orders on either platform
- One-click arb execution (buy on cheap platform, sell on expensive)
- Position management (view all open positions across platforms)
- P&L tracking (realized + unrealized)

### 5. Portfolio Dashboard
- Unified view of all positions across Polymarket + Kalshi
- Total portfolio value, daily P&L, win rate
- Position breakdown by category
- Historical performance chart
- Export to CSV

## Page Structure

```
/                    → Landing page (hero + features + CTA)
/app                 → Main trading terminal (requires auth)
/app/markets         → Market explorer grid
/app/markets/[slug]  → Individual market detail
/app/arbitrage       → Arb scanner dashboard
/app/portfolio       → Portfolio overview
/app/trade           → Active trading view (split: orderbook + chart + order entry)
/app/settings        → Account connections, preferences
```

## UI Design Principles
- **Dark mode only.** This is a trading terminal.
- **Information density.** Show more data, less whitespace. Traders want density.
- **Real-time everything.** Prices flash green/red on change. No stale data.
- **Keyboard shortcuts.** Power users trade with keys, not clicks.
- **Color coding:** Green = profit/YES, Red = loss/NO, Yellow = arb opportunity, Blue = neutral

## Color Palette
- Background: #0a0a0f (near-black with slight blue)
- Surface: #12121a
- Border: #1e1e2e
- Text primary: #e2e2e8
- Text secondary: #8888a0
- Green: #00d26a
- Red: #ff4757
- Yellow/Gold: #ffd700
- Accent blue: #4a9eff

## API Endpoints (Next.js API Routes)

```
GET  /api/markets                → All markets (paginated, filterable)
GET  /api/markets/[slug]         → Single market detail
GET  /api/markets/[slug]/book    → Order book data
GET  /api/arbitrage              → Current arb opportunities
GET  /api/portfolio              → User's positions across platforms
POST /api/trade                  → Execute a trade
POST /api/connect/polymarket     → Store Polymarket wallet connection
POST /api/connect/kalshi         → Store Kalshi API credentials
WS   /api/ws/prices              → Real-time price stream
```

## Data Sources
- **Polymarket:** gamma-api.polymarket.com (discovery) + clob.polymarket.com (execution + real prices)
- **Kalshi:** trading-api.kalshi.com (markets + execution)
- **ESPN:** site.api.espn.com (sports scores for context)
- **CoinGecko:** api.coingecko.com (crypto prices for context)

## File Structure

```
shadowbench/
├── app/
│   ├── layout.tsx              # Root layout (dark theme, fonts)
│   ├── page.tsx                # Landing page
│   ├── (terminal)/             # Trading terminal group
│   │   ├── layout.tsx          # Terminal layout (sidebar + header)
│   │   ├── markets/
│   │   │   ├── page.tsx        # Market explorer
│   │   │   └── [slug]/
│   │   │       └── page.tsx    # Market detail
│   │   ├── arbitrage/
│   │   │   └── page.tsx        # Arb scanner
│   │   ├── portfolio/
│   │   │   └── page.tsx        # Portfolio
│   │   ├── trade/
│   │   │   └── page.tsx        # Trading view
│   │   └── settings/
│   │       └── page.tsx        # Account settings
│   └── api/
│       ├── markets/
│       ├── arbitrage/
│       ├── portfolio/
│       ├── trade/
│       └── ws/
├── components/
│   ├── ui/                     # shadcn components
│   ├── charts/                 # TradingView-style charts
│   ├── orderbook/              # Order book visualization
│   ├── market-card/            # Market card component
│   ├── arb-card/               # Arbitrage opportunity card
│   ├── trade-form/             # Order entry form
│   └── portfolio/              # Portfolio components
├── lib/
│   ├── polymarket.ts           # Polymarket API client
│   ├── kalshi.ts               # Kalshi API client
│   ├── arbitrage.ts            # Arb detection engine
│   ├── websocket.ts            # WebSocket management
│   ├── db.ts                   # SQLite operations
│   └── utils.ts                # Shared utilities
├── hooks/
│   ├── use-markets.ts          # Market data hook
│   ├── use-orderbook.ts        # Order book hook
│   ├── use-portfolio.ts        # Portfolio hook
│   └── use-websocket.ts        # WebSocket hook
├── types/
│   └── index.ts                # TypeScript interfaces
├── public/
│   └── ...
├── ARCHITECTURE.md
├── package.json
└── tailwind.config.ts
```

## Build Order
1. Next.js scaffold + Tailwind + shadcn/ui setup
2. Landing page (hero, features, screenshots mockup)
3. Market explorer (Polymarket API integration)
4. Market detail page (charts, orderbook)
5. Arbitrage scanner engine + UI
6. Trading terminal (wallet connection + order execution)
7. Portfolio dashboard
8. Real-time WebSocket integration
9. Kalshi integration (second platform)
10. Polish, keyboard shortcuts, animations

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, BarChart3, Loader2 } from 'lucide-react';
import type { PolymarketMarket, OrderBook } from '@/types';
import { parseOutcomePrices, parseClobTokenIds, formatPrice, formatVolume } from '@/lib/polymarket';

export default function MarketDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [market, setMarket] = useState<PolymarketMarket | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [side, setSide] = useState<'YES' | 'NO'>('YES');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `https://gamma-api.polymarket.com/markets?condition_id=${slug}`
        );
        const data = await res.json();
        const m = data[0] || null;
        setMarket(m);

        if (m) {
          const tokens = parseClobTokenIds(m);
          if (tokens.yes) {
            try {
              const obRes = await fetch(
                `https://clob.polymarket.com/book?token_id=${tokens.yes}`
              );
              if (obRes.ok) setOrderBook(await obRes.json());
            } catch {}
          }
        }
      } catch (e) {
        console.error('Failed to load market:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue animate-spin" />
      </div>
    );
  }

  if (!market) {
    return <div className="text-center text-muted py-20">Market not found</div>;
  }

  const prices = parseOutcomePrices(market);
  const maxBookSize = Math.max(
    ...(orderBook?.bids?.map((b) => parseFloat(b.size)) || [1]),
    ...(orderBook?.asks?.map((a) => parseFloat(a.size)) || [1])
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h1 className="text-xl font-bold text-foreground mb-4">{market.question}</h1>
        <div className="flex flex-wrap gap-6">
          <div>
            <div className="text-xs text-muted mb-1">YES</div>
            <div className="text-2xl font-bold text-green">{formatPrice(prices.yes)}</div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">NO</div>
            <div className="text-2xl font-bold text-red">{formatPrice(prices.no)}</div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Volume</div>
            <div className="text-lg text-foreground font-semibold">{formatVolume(market.volume || '0')}</div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">End Date</div>
            <div className="text-lg text-foreground">
              {market.endDate ? new Date(market.endDate).toLocaleDateString() : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart placeholder + Order book */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-xl p-6 h-64 flex items-center justify-center">
            <div className="text-muted text-sm flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Price Chart Coming Soon
            </div>
          </div>

          {/* Order Book */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Order Book</h2>
            {orderBook ? (
              <div className="grid grid-cols-2 gap-4">
                {/* Bids */}
                <div>
                  <div className="flex justify-between text-xs text-muted mb-2 px-2">
                    <span>Price</span>
                    <span>Size</span>
                  </div>
                  <div className="space-y-0.5">
                    {orderBook.bids.slice(0, 12).map((bid, i) => (
                      <div key={i} className="relative flex justify-between px-2 py-1 text-xs">
                        <div
                          className="absolute inset-0 bg-green/10 rounded-sm"
                          style={{ width: `${(parseFloat(bid.size) / maxBookSize) * 100}%` }}
                        />
                        <span className="relative text-green">{parseFloat(bid.price).toFixed(2)}</span>
                        <span className="relative text-muted">{parseFloat(bid.size).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Asks */}
                <div>
                  <div className="flex justify-between text-xs text-muted mb-2 px-2">
                    <span>Price</span>
                    <span>Size</span>
                  </div>
                  <div className="space-y-0.5">
                    {orderBook.asks.slice(0, 12).map((ask, i) => (
                      <div key={i} className="relative flex justify-between px-2 py-1 text-xs">
                        <div
                          className="absolute inset-0 bg-red/10 rounded-sm right-0"
                          style={{ width: `${(parseFloat(ask.size) / maxBookSize) * 100}%`, marginLeft: 'auto' }}
                        />
                        <span className="relative text-red">{parseFloat(ask.price).toFixed(2)}</span>
                        <span className="relative text-muted">{parseFloat(ask.size).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted text-sm text-center py-8">Order book unavailable</div>
            )}
          </div>
        </div>

        {/* Trade Panel */}
        <div className="bg-surface border border-border rounded-xl p-6 h-fit">
          <h2 className="text-sm font-semibold text-foreground mb-4">Trade</h2>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSide('YES')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                side === 'YES' ? 'bg-green text-background' : 'bg-green/10 text-green'
              }`}
            >
              Buy YES
            </button>
            <button
              onClick={() => setSide('NO')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                side === 'NO' ? 'bg-red text-background' : 'bg-red/10 text-red'
              }`}
            >
              Buy NO
            </button>
          </div>
          <label className="text-xs text-muted mb-1 block">Amount ($)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-blue mb-4"
          />
          {amount && (
            <div className="flex justify-between text-xs text-muted mb-4">
              <span>Est. shares</span>
              <span>
                {(parseFloat(amount) / (side === 'YES' ? prices.yes : prices.no) || 0).toFixed(1)}
              </span>
            </div>
          )}
          <button
            disabled
            className="w-full py-3 rounded-lg text-sm font-semibold bg-blue/20 text-blue/50 cursor-not-allowed"
          >
            Connect Wallet to Trade
          </button>
        </div>
      </div>

      {/* Related markets stub */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-foreground mb-2">Related Markets</h2>
        <p className="text-muted text-sm">Coming soon</p>
      </div>
    </motion.div>
  );
}

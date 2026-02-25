'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Trash2, ExternalLink, Clock, TrendingUp } from 'lucide-react';
import type { WatchlistItem } from '@/types';
import { getWatchlist, removeFromWatchlist } from '@/lib/watchlist';
import { polymarketLink, kalshiLink } from '@/lib/links';
import { formatPrice, formatVolume } from '@/lib/polymarket';

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(getWatchlist());
    setLoaded(true);
  }, []);

  const remove = (id: string) => {
    removeFromWatchlist(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  if (!loaded) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Star className="w-6 h-6 text-gold" />
        <h1 className="text-2xl font-bold text-foreground">Watchlist</h1>
        <span className="text-sm text-muted">({items.length})</span>
      </div>

      {items.length === 0 && (
        <div className="text-center py-20">
          <Star className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted font-medium">No items saved</p>
          <p className="text-xs text-muted mt-1">Star markets or arb opportunities to track them.</p>
        </div>
      )}

      <div className="space-y-4">
        {items.map((item, i) => {
          const data = item.data;
          const isArb = item.type === 'arbitrage';

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-surface border border-border rounded-2xl p-5"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-foreground leading-snug mb-1">
                    {isArb ? data.event : data.question}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className={`px-2 py-0.5 rounded font-medium ${
                      isArb ? 'bg-gold/10 text-gold' : 'bg-blue/10 text-blue'
                    }`}>
                      {isArb ? 'Arbitrage' : 'Market'}
                    </span>
                    {data.category && (
                      <span className="px-2 py-0.5 rounded bg-blue/10 text-blue">{data.category}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Added {new Date(item.addedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => remove(item.id)}
                  className="shrink-0 p-2 text-muted hover:text-red hover:bg-red/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {isArb ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-green/5 border border-green/20 rounded-xl p-3 text-center">
                      <div className="text-xs text-muted mb-0.5">{data.platformA}</div>
                      <div className="text-xl font-bold text-green">{(data.platformAPrice * 100).toFixed(1)}¢</div>
                    </div>
                    <div className="bg-red/5 border border-red/20 rounded-xl p-3 text-center">
                      <div className="text-xs text-muted mb-0.5">{data.platformB}</div>
                      <div className="text-xl font-bold text-red">{(data.platformBPrice * 100).toFixed(1)}¢</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center mb-3">
                    <span className="inline-flex items-center gap-1 bg-green/15 text-green px-3 py-1 rounded-full text-sm font-bold">
                      <TrendingUp className="w-3 h-3" />
                      {data.spreadPercent?.toFixed(1)}% Spread
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 bg-green/10 hover:bg-green/20 text-green px-3 py-2.5 rounded-xl text-xs font-medium transition-colors">
                      Trade on Polymarket <ExternalLink className="w-3 h-3" />
                    </a>
                    <a href="https://kalshi.com" target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 bg-blue/10 hover:bg-blue/20 text-blue px-3 py-2.5 rounded-xl text-xs font-medium transition-colors">
                      Trade on Kalshi <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 bg-green/10 rounded-lg px-3 py-2 text-center">
                      <div className="text-xs text-muted mb-0.5">YES</div>
                      <div className="text-lg text-green font-bold">
                        {data.outcomePrices ? formatPrice(JSON.parse(data.outcomePrices)[0] || 0) : '—'}
                      </div>
                    </div>
                    <div className="flex-1 bg-red/10 rounded-lg px-3 py-2 text-center">
                      <div className="text-xs text-muted mb-0.5">NO</div>
                      <div className="text-lg text-red font-bold">
                        {data.outcomePrices ? formatPrice(JSON.parse(data.outcomePrices)[1] || 0) : '—'}
                      </div>
                    </div>
                  </div>
                  <a
                    href={polymarketLink({ slug: data.slug, conditionId: data.conditionId })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 bg-green/10 hover:bg-green/20 text-green px-3 py-2.5 rounded-xl text-xs font-medium transition-colors w-full"
                  >
                    View on Polymarket <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

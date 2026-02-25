'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Search, TrendingUp, Clock, Flame, Loader2 } from 'lucide-react';
import type { PolymarketMarket } from '@/types';
import { parseOutcomePrices, formatPrice, formatVolume } from '@/lib/polymarket';

const CATEGORIES = ['All', 'Politics', 'Crypto', 'Sports', 'Entertainment'] as const;
const SORT_OPTIONS = [
  { label: 'Volume', value: 'volume' },
  { label: 'Newest', value: 'newest' },
  { label: 'Ending Soon', value: 'ending' },
] as const;

function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 animate-pulse">
      <div className="h-4 bg-border rounded w-3/4 mb-3" />
      <div className="h-3 bg-border rounded w-1/2 mb-4" />
      <div className="flex gap-4">
        <div className="h-8 bg-border rounded flex-1" />
        <div className="h-8 bg-border rounded flex-1" />
      </div>
    </div>
  );
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<PolymarketMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [sort, setSort] = useState<string>('volume');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          'https://gamma-api.polymarket.com/markets?closed=false&limit=100&order=volume&ascending=false'
        );
        const data = await res.json();
        setMarkets(data);
      } catch (e) {
        console.error('Failed to fetch markets:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = markets;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.question?.toLowerCase().includes(q));
    }

    if (category !== 'All') {
      result = result.filter((m) => m.category?.toLowerCase() === category.toLowerCase());
    }

    if (sort === 'newest') {
      result = [...result].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    } else if (sort === 'ending') {
      result = [...result].sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    }

    return result;
  }, [markets, search, category, sort]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Markets</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter markets..."
              className="bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-blue w-64"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              category === cat
                ? 'bg-blue/10 text-blue'
                : 'text-muted hover:text-foreground hover:bg-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((market, i) => {
            const prices = parseOutcomePrices(market);
            const slug = market.conditionId || market.slug || market.id;
            return (
              <motion.div
                key={market.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                whileHover={{ borderColor: '#4a9eff' }}
              >
                <Link href={`/markets/${slug}`}>
                  <div className="bg-surface border border-border rounded-xl p-4 hover:bg-white/[0.02] transition-colors cursor-pointer h-full flex flex-col">
                    <p className="text-sm font-medium text-foreground mb-3 line-clamp-2 flex-1">
                      {market.question}
                    </p>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 bg-green/10 rounded-lg px-3 py-2 text-center">
                        <div className="text-xs text-muted mb-0.5">YES</div>
                        <div className="text-green font-bold text-lg">{formatPrice(prices.yes)}</div>
                      </div>
                      <div className="flex-1 bg-red/10 rounded-lg px-3 py-2 text-center">
                        <div className="text-xs text-muted mb-0.5">NO</div>
                        <div className="text-red font-bold text-lg">{formatPrice(prices.no)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        {formatVolume(market.volume24hr || market.volume || '0')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {market.endDate ? new Date(market.endDate).toLocaleDateString() : '—'}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center text-muted py-20">No markets found</div>
      )}
    </div>
  );
}

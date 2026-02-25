'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Clock, Flame, Star, ExternalLink } from 'lucide-react';
import type { PolymarketMarket } from '@/types';
import { parseOutcomePrices, formatPrice, formatVolume } from '@/lib/polymarket';
import { polymarketLink } from '@/lib/links';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/watchlist';

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

function MarketCard({ market, index, large }: { market: PolymarketMarket; index: number; large?: boolean }) {
  const prices = parseOutcomePrices(market);
  const isYesFavored = prices.yes > 0.5;
  const [starred, setStarred] = useState(false);

  useEffect(() => {
    setStarred(isInWatchlist(market.id || market.conditionId));
  }, [market.id, market.conditionId]);

  const toggleStar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const id = market.id || market.conditionId;
    if (starred) {
      removeFromWatchlist(id);
    } else {
      addToWatchlist({ id, type: 'market', addedAt: Date.now(), data: market });
    }
    setStarred(!starred);
  };

  const pmLink = polymarketLink({ slug: market.slug, conditionId: market.conditionId });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="bg-surface border border-border rounded-xl overflow-hidden hover:border-blue/40 transition-colors h-full"
    >
      <div className={`flex h-full ${large ? 'p-5' : 'p-4'}`}>
        <div className={`w-1 rounded-full shrink-0 mr-3 ${isYesFavored ? 'bg-green' : 'bg-red'}`} />
        <div className="flex-1 flex flex-col">
          <div className="flex items-start gap-2 mb-2">
            <p className={`font-medium text-foreground line-clamp-2 flex-1 ${large ? 'text-base' : 'text-sm'}`}>
              {market.question}
            </p>
            <button
              onClick={toggleStar}
              className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                starred ? 'text-gold bg-gold/10' : 'text-muted hover:text-gold hover:bg-gold/5'
              }`}
            >
              <Star className={`w-4 h-4 ${starred ? 'fill-current' : ''}`} />
            </button>
          </div>

          {market.category && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue/10 text-blue w-fit mb-2">
              {market.category}
            </span>
          )}

          <div className="flex items-center gap-3 mb-3 mt-auto">
            <div className="flex-1 bg-green/10 rounded-lg px-3 py-2 text-center">
              <div className="text-xs text-muted mb-0.5">YES</div>
              <div className={`text-green font-bold ${large ? 'text-xl' : 'text-lg'}`}>{formatPrice(prices.yes)}</div>
            </div>
            <div className="flex-1 bg-red/10 rounded-lg px-3 py-2 text-center">
              <div className="text-xs text-muted mb-0.5">NO</div>
              <div className={`text-red font-bold ${large ? 'text-xl' : 'text-lg'}`}>{formatPrice(prices.no)}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted mb-3">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3" />
              {formatVolume(market.volume24hr || market.volume || '0')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {market.endDate ? new Date(market.endDate).toLocaleDateString() : '—'}
            </span>
          </div>

          {/* Deep links */}
          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href={pmLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 bg-green/10 hover:bg-green/20 text-green px-3 py-2 rounded-lg text-xs font-medium transition-colors flex-1"
            >
              View on Polymarket
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
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
        const res = await fetch('/api/markets?limit=100');
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

  const hotMarkets = useMemo(() => markets.slice(0, 3), [markets]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Markets</h1>
          {!loading && <p className="text-xs text-muted mt-1">Showing {filtered.length} markets</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter markets..."
              className="bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-blue w-full sm:w-64"
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

      {!loading && hotMarkets.length > 0 && !search && category === 'All' && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-gold" />
            <h2 className="text-sm font-semibold text-gold">Hot Markets</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hotMarkets.map((m, i) => (
              <MarketCard key={m.id || i} market={m} index={i} large />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto">
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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((market, i) => (
            <MarketCard key={market.id || i} market={market} index={i} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center text-muted py-20">No markets found</div>
      )}
    </div>
  );
}

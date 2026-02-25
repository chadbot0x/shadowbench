'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCompare, RefreshCw, AlertCircle, Loader2, Zap, TrendingUp, Clock, Filter, Star, ExternalLink } from 'lucide-react';
import type { ArbitrageOpportunity, ScanResult } from '@/types';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/watchlist';

function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 animate-pulse">
      <div className="h-5 bg-border rounded w-3/4 mb-4" />
      <div className="flex gap-4 mb-4">
        <div className="h-16 bg-border rounded flex-1" />
        <div className="h-16 bg-border rounded flex-1" />
      </div>
      <div className="h-10 bg-border rounded w-full" />
    </div>
  );
}

const TYPES = ['All', 'Cross-Platform', 'Intra-Market'] as const;
const CATEGORIES = ['All', 'Sports', 'Politics', 'Crypto', 'World'] as const;
const SORT_OPTIONS = [
  { label: 'Spread %', value: 'spread' },
  { label: 'Profit', value: 'profit' },
  { label: 'Volume', value: 'volume' },
] as const;

function ConfidenceDots({ level }: { level: 'high' | 'medium' | 'low' }) {
  const filled = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map(i => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${
            i <= filled
              ? level === 'high' ? 'bg-green' : level === 'medium' ? 'bg-gold' : 'bg-muted'
              : 'bg-border'
          }`}
        />
      ))}
    </div>
  );
}

function ArbCard({ arb, index }: { arb: ArbitrageOpportunity; index: number }) {
  const [starred, setStarred] = useState(false);

  useEffect(() => {
    setStarred(isInWatchlist(arb.id));
  }, [arb.id]);

  const toggleStar = () => {
    if (starred) {
      removeFromWatchlist(arb.id);
    } else {
      addToWatchlist({ id: arb.id, type: 'arbitrage', addedAt: Date.now(), data: arb });
    }
    setStarred(!starred);
  };

  const isHot = arb.spreadPercent > 5;

  // Determine which platform links to show
  const platformAIsPolymarket = arb.platformA === 'Polymarket' || arb.platformA === 'Polymarket YES';
  const platformBIsPolymarket = arb.platformB === 'Polymarket' || arb.platformB === 'Polymarket NO';
  const showPolymarket = platformAIsPolymarket || platformBIsPolymarket || arb.type === 'intra-market';
  const showKalshi = arb.platformA === 'Kalshi' || arb.platformB === 'Kalshi';

  // Use actual deep links from the arb data
  const polyLink = platformAIsPolymarket ? arb.deepLinkA : arb.deepLinkB;
  const kalLink = arb.platformA === 'Kalshi' ? arb.deepLinkA : arb.deepLinkB;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.03 }}
      className={`bg-surface border rounded-2xl overflow-hidden transition-colors ${
        isHot ? 'border-gold/40' : 'border-border hover:border-gold/20'
      }`}
    >
      <div className="p-5 md:p-6">
        {/* Header: event name + badges + star */}
        <div className="flex items-start gap-3 mb-4">
          {isHot && (
            <span className="relative flex h-3 w-3 mt-1 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-gold" />
            </span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base md:text-lg font-semibold text-foreground leading-snug mb-2">
              {arb.event}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue/10 text-blue font-medium">
                {arb.category}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                arb.type === 'cross-platform' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue/10 text-blue'
              }`}>
                {arb.type === 'cross-platform' ? 'Cross-Platform' : 'Intra-Market'}
              </span>
              <ConfidenceDots level={arb.confidence} />
            </div>
          </div>
          <button
            onClick={toggleStar}
            className={`shrink-0 p-2 rounded-lg transition-colors ${
              starred ? 'text-gold bg-gold/10' : 'text-muted hover:text-gold hover:bg-gold/5'
            }`}
          >
            <Star className={`w-5 h-5 ${starred ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Price comparison - BIG and clear */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green/5 border border-green/20 rounded-xl p-4 text-center">
            <div className="text-xs text-muted mb-1">{arb.platformA}</div>
            <div className="text-2xl md:text-3xl font-bold text-green">
              {(arb.platformAPrice * 100).toFixed(1)}¢
            </div>
          </div>
          <div className="bg-red/5 border border-red/20 rounded-xl p-4 text-center">
            <div className="text-xs text-muted mb-1">{arb.platformB}</div>
            <div className="text-2xl md:text-3xl font-bold text-red">
              {(arb.platformBPrice * 100).toFixed(1)}¢
            </div>
          </div>
        </div>

        {/* Spread badge - prominent */}
        <div className="flex items-center justify-center mb-4">
          <span className="inline-flex items-center gap-2 bg-green/15 text-green px-4 py-2 rounded-full text-sm font-bold">
            <TrendingUp className="w-4 h-4" />
            {arb.spreadPercent.toFixed(1)}% Spread
          </span>
        </div>

        {/* Volume + timestamp row */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted mb-5">
          {arb.volumeA !== undefined && (
            <span>{arb.platformA}: ${((arb.volumeA || 0) / 1000).toFixed(0)}K vol</span>
          )}
          {arb.volumeB !== undefined && (
            <span>{arb.platformB}: ${((arb.volumeB || 0) / 1000).toFixed(0)}K vol</span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Just now
          </span>
        </div>

        {/* Details */}
        {arb.details && (
          <p className="text-xs text-muted leading-relaxed mb-5 bg-background/50 rounded-lg p-3">
            {arb.details}
          </p>
        )}

        {/* Trade buttons - prominent, full-width on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {showPolymarket && (
            <a
              href={polyLink || 'https://polymarket.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green/15 hover:bg-green/25 text-green font-semibold px-4 py-3 rounded-xl text-sm transition-colors"
            >
              Trade on Polymarket
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {showKalshi && (
            <a
              href={kalLink || 'https://kalshi.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-blue/15 hover:bg-blue/25 text-blue font-semibold px-4 py-3 rounded-xl text-sm transition-colors"
            >
              Trade on Kalshi
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {arb.type === 'intra-market' && (
            <a
              href={arb.deepLinkA || 'https://polymarket.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green/15 hover:bg-green/25 text-green font-semibold px-4 py-3 rounded-xl text-sm transition-colors sm:col-span-2"
            >
              Trade on Polymarket
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ArbitragePage() {
  const [data, setData] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [minSpread, setMinSpread] = useState(0);
  const [sortBy, setSortBy] = useState('spread');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/arbitrage');
      if (!res.ok) throw new Error('Failed to fetch');
      const result: ScanResult = await res.json();
      setData(result);
      setLastUpdated(new Date());
    } catch {
      setError('Failed to scan markets. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let result = data.opportunities;

    if (typeFilter === 'Cross-Platform') result = result.filter(o => o.type === 'cross-platform');
    else if (typeFilter === 'Intra-Market') result = result.filter(o => o.type === 'intra-market');

    if (categoryFilter !== 'All') {
      const catLower = categoryFilter.toLowerCase();
      result = result.filter(o => (o.category || '').toLowerCase().includes(catLower));
    }

    if (minSpread > 0) result = result.filter(o => o.spreadPercent >= minSpread);

    if (sortBy === 'profit') result = [...result].sort((a, b) => b.potentialProfit - a.potentialProfit);
    else if (sortBy === 'volume') result = [...result].sort((a, b) => (b.volumeA || 0) - (a.volumeA || 0));

    return result;
  }, [data, typeFilter, minSpread, sortBy]);

  const bestSpread = data?.opportunities.reduce((max, o) => Math.max(max, o.spreadPercent), 0) || 0;
  const avgSpread = data?.opportunities.length
    ? data.opportunities.reduce((s, o) => s + o.spreadPercent, 0) / data.opportunities.length
    : 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <GitCompare className="w-6 h-6 text-gold" />
        <h1 className="text-2xl font-bold text-foreground">Arbitrage Scanner</h1>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="ml-auto flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Opportunities', value: data?.metadata.matches_found ?? '—', icon: Zap, color: 'text-gold' },
          { label: 'Best Spread', value: bestSpread ? `${bestSpread.toFixed(1)}%` : '—', icon: TrendingUp, color: 'text-green' },
          { label: 'Avg Spread', value: avgSpread ? `${avgSpread.toFixed(1)}%` : '—', icon: Filter, color: 'text-blue' },
          { label: 'Last Updated', value: lastUpdated ? lastUpdated.toLocaleTimeString() : '—', icon: Clock, color: 'text-muted' },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted">{stat.label}</span>
            </div>
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === t ? 'bg-gold/15 text-gold' : 'text-muted hover:text-foreground hover:bg-white/5'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === c ? 'bg-blue/15 text-blue' : 'text-muted hover:text-foreground hover:bg-white/5'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <select
          value={minSpread}
          onChange={(e) => setMinSpread(Number(e.target.value))}
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
        >
          <option value={0}>Min Spread: Any</option>
          <option value={2}>Min Spread: 2%</option>
          <option value={5}>Min Spread: 5%</option>
          <option value={10}>Min Spread: 10%</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>Sort: {o.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red/10 border border-red/20 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red mx-auto mb-2" />
          <p className="text-sm text-red mb-3">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="bg-red/20 text-red px-4 py-2 rounded-lg text-sm hover:bg-red/30 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-20">
          <GitCompare className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted">No arbitrage opportunities found</p>
          <p className="text-xs text-muted mt-1">Try adjusting filters or wait for the next scan</p>
        </div>
      )}

      <div className="space-y-4">
        <AnimatePresence>
          {filtered.map((arb, i) => (
            <ArbCard key={arb.id} arb={arb} index={i} />
          ))}
        </AnimatePresence>
      </div>

      {data?.metadata && (
        <div className="mt-6 text-center text-xs text-muted">
          Scanned {data.metadata.markets_scanned} markets in {data.metadata.scan_time_ms}ms
        </div>
      )}
    </div>
  );
}

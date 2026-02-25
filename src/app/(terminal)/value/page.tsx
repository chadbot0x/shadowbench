'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Star,
  ExternalLink,
  ArrowRight,
  Zap,
  Filter,
} from 'lucide-react';
import type { ValuePick } from '@/lib/value';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/watchlist';

interface ValueResponse {
  picks: ValuePick[];
  metadata: {
    scan_time_ms: number;
    markets_analyzed: number;
    picks_found: number;
    timestamp: string;
  };
}

const CATEGORIES = ['All', 'Sports', 'Politics', 'Crypto', 'World'] as const;
const SORT_OPTIONS = [
  { label: 'EV %', value: 'ev' },
  { label: 'Confidence', value: 'confidence' },
  { label: 'Volume', value: 'volume' },
] as const;

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

function ConfidenceDots({ level }: { level: 'high' | 'medium' | 'low' }) {
  const filled = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${
            i <= filled
              ? level === 'high'
                ? 'bg-green'
                : level === 'medium'
                  ? 'bg-gold'
                  : 'bg-muted'
              : 'bg-border'
          }`}
        />
      ))}
      <span className="text-[10px] text-muted ml-1 capitalize">{level}</span>
    </div>
  );
}

function DirectionBadge({ direction }: { direction: ValuePick['direction'] }) {
  const config = {
    buy_yes: { label: 'BUY YES', bg: 'bg-green/15', text: 'text-green' },
    buy_no: { label: 'BUY NO', bg: 'bg-red/15', text: 'text-red' },
    fade: { label: 'FADE', bg: 'bg-gold/15', text: 'text-gold' },
  };
  const c = config[direction];
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: 'Polymarket' | 'Kalshi' }) {
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded font-medium ${
        platform === 'Polymarket' ? 'bg-green/10 text-green' : 'bg-blue/10 text-blue'
      }`}
    >
      {platform}
    </span>
  );
}

function PickCard({ pick, index }: { pick: ValuePick; index: number }) {
  const [starred, setStarred] = useState(false);

  useEffect(() => {
    setStarred(isInWatchlist(pick.id));
  }, [pick.id]);

  const toggleStar = () => {
    if (starred) {
      removeFromWatchlist(pick.id);
    } else {
      addToWatchlist({ id: pick.id, type: 'market', addedAt: Date.now(), data: pick });
    }
    setStarred(!starred);
  };

  const isPositive = pick.ev > 0;
  const evColor = isPositive ? 'text-green' : 'text-red';
  const evBg = isPositive ? 'bg-green/15' : 'bg-red/15';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.03 }}
      className="bg-surface border border-border hover:border-gold/20 rounded-2xl overflow-hidden transition-colors"
    >
      <div className="p-5 md:p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-base md:text-lg font-semibold text-foreground leading-snug mb-2">
              {pick.market}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <PlatformBadge platform={pick.platform} />
              <DirectionBadge direction={pick.direction} />
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue/10 text-blue font-medium">
                {pick.category}
              </span>
              <ConfidenceDots level={pick.confidence} />
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

        {/* Price comparison */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-background/50 border border-border rounded-xl p-4 text-center">
            <div className="text-xs text-muted mb-1">Current Price</div>
            <div className="text-2xl md:text-3xl font-bold text-foreground">
              {(pick.currentPrice * 100).toFixed(1)}¢
            </div>
          </div>
          <div className={`${isPositive ? 'bg-green/5 border-green/20' : 'bg-red/5 border-red/20'} border rounded-xl p-4 text-center`}>
            <div className="text-xs text-muted mb-1 flex items-center justify-center gap-1">
              Fair Value
              {isPositive ? <TrendingUp className="w-3 h-3 text-green" /> : <TrendingDown className="w-3 h-3 text-red" />}
            </div>
            <div className={`text-2xl md:text-3xl font-bold ${evColor}`}>
              {(pick.estimatedFairValue * 100).toFixed(1)}¢
            </div>
          </div>
        </div>

        {/* EV Badge */}
        <div className="flex items-center justify-center mb-4">
          <span className={`inline-flex items-center gap-2 ${evBg} ${evColor} px-4 py-2 rounded-full text-sm font-bold`}>
            <Zap className="w-4 h-4" />
            {isPositive ? '+' : ''}{pick.evPercent.toFixed(1)}% EV
          </span>
        </div>

        {/* Thesis */}
        <p className="text-xs text-muted leading-relaxed mb-4 bg-background/50 rounded-lg p-3 italic">
          {pick.thesis}
        </p>

        {/* Volume + timestamp */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted mb-5">
          <span>
            Vol: {pick.volume >= 1_000_000
              ? `$${(pick.volume / 1_000_000).toFixed(1)}M`
              : pick.volume >= 1_000
                ? `$${(pick.volume / 1_000).toFixed(0)}K`
                : `$${pick.volume.toFixed(0)}`}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Just now
          </span>
        </div>

        {/* Trade button */}
        <a
          href={pick.deepLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-2 font-semibold px-4 py-3 rounded-xl text-sm transition-colors w-full ${
            pick.platform === 'Polymarket'
              ? 'bg-green/15 hover:bg-green/25 text-green'
              : 'bg-blue/15 hover:bg-blue/25 text-blue'
          }`}
        >
          Trade on {pick.platform}
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </motion.div>
  );
}

export default function ValuePicksPage() {
  const [data, setData] = useState<ValueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState('ev');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/value');
      if (!res.ok) throw new Error('Failed to fetch');
      const result: ValueResponse = await res.json();
      setData(result);
      setLastUpdated(new Date());
    } catch {
      setError('Failed to scan for value picks. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let result = data.picks;

    if (categoryFilter !== 'All') {
      result = result.filter((p) => p.category === categoryFilter);
    }

    if (sortBy === 'confidence') {
      const order = { high: 3, medium: 2, low: 1 };
      result = [...result].sort((a, b) => order[b.confidence] - order[a.confidence]);
    } else if (sortBy === 'volume') {
      result = [...result].sort((a, b) => b.volume - a.volume);
    }
    // default: already sorted by EV%

    return result;
  }, [data, categoryFilter, sortBy]);

  const bestEv = data?.picks.reduce((max, p) => Math.max(max, p.evPercent), 0) || 0;
  const avgEv = data?.picks.length
    ? data.picks.reduce((s, p) => s + Math.abs(p.evPercent), 0) / data.picks.length
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <BarChart3 className="w-6 h-6 text-gold" />
        <h1 className="text-2xl font-bold text-foreground">Value Picks</h1>
        <button
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          className="ml-auto flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      <p className="text-sm text-muted mb-6">Markets where the odds look wrong</p>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Picks', value: data?.metadata.picks_found ?? '—', icon: Zap, color: 'text-gold' },
          { label: 'Best EV', value: bestEv ? `+${bestEv.toFixed(1)}%` : '—', icon: TrendingUp, color: 'text-green' },
          { label: 'Avg EV', value: avgEv ? `${avgEv.toFixed(1)}%` : '—', icon: Filter, color: 'text-blue' },
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
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === c
                  ? 'bg-gold/15 text-gold'
                  : 'text-muted hover:text-foreground hover:bg-white/5'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Sort: {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red/10 border border-red/20 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red mx-auto mb-2" />
          <p className="text-sm text-red mb-3">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            className="bg-red/20 text-red px-4 py-2 rounded-lg text-sm hover:bg-red/30 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && !data && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-20">
          <BarChart3 className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted">No value picks detected right now.</p>
          <p className="text-xs text-muted mt-1">
            Check back in 60 seconds — markets move fast.
          </p>
        </div>
      )}

      {/* Pick cards */}
      <div className="space-y-4">
        <AnimatePresence>
          {filtered.map((pick, i) => (
            <PickCard key={pick.id} pick={pick} index={i} />
          ))}
        </AnimatePresence>
      </div>

      {/* Footer metadata */}
      {data?.metadata && (
        <div className="mt-6 text-center text-xs text-muted">
          Analyzed {data.metadata.markets_analyzed} markets in {data.metadata.scan_time_ms}ms
        </div>
      )}
    </div>
  );
}

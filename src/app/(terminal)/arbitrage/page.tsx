'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCompare, RefreshCw, ChevronDown, ChevronUp, AlertCircle, Loader2, Zap, TrendingUp, Clock, Filter } from 'lucide-react';
import type { ArbitrageOpportunity, ScanResult } from '@/types';

function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 animate-pulse">
      <div className="h-4 bg-border rounded w-3/4 mb-3" />
      <div className="flex gap-4 mb-3">
        <div className="h-10 bg-border rounded flex-1" />
        <div className="h-10 bg-border rounded flex-1" />
      </div>
      <div className="h-3 bg-border rounded w-1/3" />
    </div>
  );
}

const TYPES = ['All', 'Cross-Platform', 'Intra-Market'] as const;
const SORT_OPTIONS = [
  { label: 'Spread %', value: 'spread' },
  { label: 'Profit', value: 'profit' },
  { label: 'Volume', value: 'volume' },
] as const;

export default function ArbitragePage() {
  const [data, setData] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [minSpread, setMinSpread] = useState(0);
  const [sortBy, setSortBy] = useState('spread');
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

    if (minSpread > 0) result = result.filter(o => o.spreadPercent >= minSpread);

    if (sortBy === 'profit') result = [...result].sort((a, b) => b.potentialProfit - a.potentialProfit);
    else if (sortBy === 'volume') result = [...result].sort((a, b) => (b.volumeA || 0) - (a.volumeA || 0));
    // default is spread, already sorted

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

      {/* Error state */}
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

      {/* Loading */}
      {loading && !data && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Cards */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-20">
          <GitCompare className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted">No arbitrage opportunities found</p>
          <p className="text-xs text-muted mt-1">Try adjusting filters or wait for the next scan</p>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map((arb, i) => {
            const isExpanded = expandedId === arb.id;
            const isHot = arb.spreadPercent > 5;
            return (
              <motion.div
                key={arb.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.03 }}
                className={`bg-surface border rounded-xl overflow-hidden transition-colors ${
                  isHot ? 'border-gold/40' : 'border-border hover:border-gold/20'
                }`}
              >
                <div className="p-4 flex items-center gap-4">
                  {/* Hot indicator */}
                  <div className="shrink-0 w-3 flex justify-center">
                    {isHot && (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground truncate">{arb.event}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                        arb.confidence === 'high' ? 'bg-green/15 text-green' :
                        arb.confidence === 'medium' ? 'bg-gold/15 text-gold' :
                        'bg-muted/15 text-muted'
                      }`}>
                        {arb.confidence.toUpperCase()}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue/10 text-blue shrink-0">
                        {arb.type === 'cross-platform' ? 'Cross' : 'Intra'}
                      </span>
                    </div>
                    <span className="text-xs text-muted">{arb.category}</span>
                  </div>

                  <div className="text-center shrink-0">
                    <div className="text-[10px] text-green">{arb.platformA}</div>
                    <div className="text-sm font-bold text-green">{(arb.platformAPrice * 100).toFixed(1)}¢</div>
                  </div>

                  <div className="text-center shrink-0">
                    <div className="text-[10px] text-red">{arb.platformB}</div>
                    <div className="text-sm font-bold text-red">{(arb.platformBPrice * 100).toFixed(1)}¢</div>
                  </div>

                  <div className="text-center shrink-0 min-w-[70px]">
                    <div className="text-[10px] text-muted">Spread</div>
                    <div className="text-sm font-bold text-gold">{arb.spreadPercent.toFixed(1)}%</div>
                  </div>

                  <div className="text-center shrink-0 min-w-[60px]">
                    <div className="text-[10px] text-muted">$100 →</div>
                    <div className="text-sm font-bold text-green">${arb.potentialProfit.toFixed(2)}</div>
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : arb.id)}
                    className="text-muted hover:text-foreground transition-colors shrink-0"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0 border-t border-border">
                        <div className="mt-3 text-xs text-muted leading-relaxed">
                          {arb.details}
                        </div>
                        <div className="mt-2 flex gap-4 text-xs text-muted">
                          <span>Match Score: {(arb.matchScore * 100).toFixed(0)}%</span>
                          {arb.volumeA !== undefined && <span>Vol A: ${((arb.volumeA || 0) / 1000).toFixed(0)}K</span>}
                          {arb.volumeB !== undefined && <span>Vol B: ${((arb.volumeB || 0) / 1000).toFixed(0)}K</span>}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Scan metadata */}
      {data?.metadata && (
        <div className="mt-6 text-center text-xs text-muted">
          Scanned {data.metadata.markets_scanned} markets in {data.metadata.scan_time_ms}ms
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RefreshCw, TrendingUp, Clock, Filter, Zap, ExternalLink, Loader2 } from 'lucide-react';
import type { ArbitrageOpportunity } from '@/types';

interface SportsResponse {
  opportunities: (ArbitrageOpportunity & { sport?: string; matchup?: string })[];
  metadata: { scan_time_ms: number; markets_scanned: number; matches_found: number };
}

const SPORTS = ['All', 'NBA', 'NFL', 'MLB', 'NHL', 'Soccer', 'MMA'] as const;

const SPORT_COLORS: Record<string, string> = {
  NBA: 'bg-orange-500/15 text-orange-400',
  NFL: 'bg-green/15 text-green',
  MLB: 'bg-red/15 text-red',
  NHL: 'bg-blue/15 text-blue',
  Soccer: 'bg-emerald-500/15 text-emerald-400',
  MMA: 'bg-purple-500/15 text-purple-400',
};

export default function SportsPage() {
  const [data, setData] = useState<SportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState('All');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/sports');
      if (!res.ok) throw new Error('Failed');
      const result = await res.json();
      setData(result);
      setLastUpdated(new Date());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (!data?.opportunities) return [];
    if (sportFilter === 'All') return data.opportunities;
    return data.opportunities.filter(o => o.sport === sportFilter || o.category === sportFilter);
  }, [data, sportFilter]);

  const bestSpread = data?.opportunities.reduce((max, o) => Math.max(max, o.spreadPercent), 0) || 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-gold" />
        <h1 className="text-2xl font-bold text-foreground">Sports Scanner</h1>
        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs text-green">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green" />
            </span>
            Scanning sports markets...
          </span>
          <button onClick={() => { setLoading(true); fetchData(); }} className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Sports Arbs', value: data?.metadata?.matches_found ?? '—', icon: Zap, color: 'text-gold' },
          { label: 'Best Spread', value: bestSpread ? `${bestSpread.toFixed(1)}%` : '—', icon: TrendingUp, color: 'text-green' },
          { label: 'Last Scan', value: lastUpdated ? lastUpdated.toLocaleTimeString() : '—', icon: Clock, color: 'text-muted' },
        ].map(stat => (
          <div key={stat.label} className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted">{stat.label}</span>
            </div>
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Sport filters */}
      <div className="flex flex-wrap gap-1 mb-6">
        {SPORTS.map(s => (
          <button
            key={s}
            onClick={() => setSportFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              sportFilter === s ? 'bg-gold/15 text-gold' : 'text-muted hover:text-foreground hover:bg-white/5'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && !data && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-6 animate-pulse">
              <div className="h-5 bg-border rounded w-3/4 mb-4" />
              <div className="flex gap-4 mb-4">
                <div className="h-16 bg-border rounded flex-1" />
                <div className="h-16 bg-border rounded flex-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <Trophy className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">No sports arbs detected right now</p>
          <p className="text-xs text-muted">Markets are most active during game days. Check back soon.</p>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-4">
        <AnimatePresence>
          {filtered.map((arb, i) => {
            const sport = arb.sport || arb.category;
            const colorClass = SPORT_COLORS[sport] || 'bg-blue/10 text-blue';
            return (
              <motion.div
                key={arb.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.03 }}
                className="bg-surface border border-border hover:border-gold/20 rounded-2xl overflow-hidden transition-colors"
              >
                <div className="p-5 md:p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-base md:text-lg font-semibold text-foreground leading-snug mb-2">
                        {arb.matchup || arb.event}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${colorClass}`}>
                          {sport}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          arb.type === 'cross-platform' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue/10 text-blue'
                        }`}>
                          {arb.type === 'cross-platform' ? 'Cross-Platform' : 'Intra-Market'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-green/5 border border-green/20 rounded-xl p-4 text-center">
                      <div className="text-xs text-muted mb-1">{arb.platformA}</div>
                      <div className="text-2xl font-bold text-green">{(arb.platformAPrice * 100).toFixed(1)}¢</div>
                    </div>
                    <div className="bg-red/5 border border-red/20 rounded-xl p-4 text-center">
                      <div className="text-xs text-muted mb-1">{arb.platformB}</div>
                      <div className="text-2xl font-bold text-red">{(arb.platformBPrice * 100).toFixed(1)}¢</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center mb-4">
                    <span className="inline-flex items-center gap-2 bg-green/15 text-green px-4 py-2 rounded-full text-sm font-bold">
                      <TrendingUp className="w-4 h-4" />
                      {arb.spreadPercent.toFixed(1)}% Spread
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-green/15 hover:bg-green/25 text-green font-semibold px-4 py-3 rounded-xl text-sm transition-colors">
                      Trade on Polymarket <ExternalLink className="w-4 h-4" />
                    </a>
                    <a href="https://kalshi.com" target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-blue/15 hover:bg-blue/25 text-blue font-semibold px-4 py-3 rounded-xl text-sm transition-colors">
                      Trade on Kalshi <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

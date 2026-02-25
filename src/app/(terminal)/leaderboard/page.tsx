'use client';

import { useEffect, useState, useCallback } from 'react';
import { Award, TrendingUp, Zap, BarChart3, RefreshCw, Trophy } from 'lucide-react';

interface LeaderboardResponse {
  total_scans: number;
  total_arbs_detected: number;
  avg_spread_pct: number;
  profitable_count: number;
  profitable_pct: number;
  best_arb: {
    event: string;
    spread_pct: number;
    platforms: string;
    confidence: string;
  } | null;
  history_entries: number;
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/history?leaderboard=true');
      if (!res.ok) throw new Error('Failed');
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Award className="w-6 h-6 text-gold" />
        <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
        <button onClick={fetchData} className="ml-auto flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Total Scans', value: data.total_scans.toLocaleString(), icon: BarChart3, color: 'text-muted' },
            { label: 'Arbs Detected', value: data.total_arbs_detected.toLocaleString(), icon: Zap, color: 'text-gold' },
            { label: 'Avg Spread', value: data.avg_spread_pct ? `${data.avg_spread_pct.toFixed(1)}%` : '—', icon: TrendingUp, color: 'text-blue' },
            { label: 'Profitable (>2%)', value: data.profitable_count > 0 ? `${data.profitable_pct.toFixed(0)}%` : '—', icon: Award, color: 'text-green' },
            { label: 'Best Arb', value: data.best_arb ? `${data.best_arb.spread_pct.toFixed(1)}%` : '—', icon: Trophy, color: 'text-gold' },
          ].map(stat => (
            <div key={stat.label} className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted">{stat.label}</span>
              </div>
              <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Best arb detail */}
      {data?.best_arb && (
        <div className="bg-surface border border-gold/30 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3">🏆 Best Arb Ever Detected</h2>
          <div className="space-y-2">
            <p className="text-sm text-foreground font-medium">{data.best_arb.event}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted">
              <span className="bg-green/15 text-green px-2 py-1 rounded-full font-bold">
                {data.best_arb.spread_pct.toFixed(1)}% spread
              </span>
              <span className="bg-blue/10 text-blue px-2 py-1 rounded">{data.best_arb.platforms}</span>
              <span className="bg-gold/10 text-gold px-2 py-1 rounded capitalize">{data.best_arb.confidence} confidence</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 animate-pulse">
              <div className="h-5 bg-border rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && (!data || data.total_arbs_detected === 0) && (
        <div className="text-center py-20">
          <Trophy className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">Leaderboard populates as the scanner runs</p>
          <p className="text-xs text-muted">
            {data ? `${data.total_scans} scans completed so far. Arbs will appear when cross-platform price gaps are detected.` : 'Check back in a few hours.'}
          </p>
        </div>
      )}

      {/* Scanner activity summary */}
      {data && data.total_scans > 0 && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Scanner Activity</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted">Total scans completed</span>
              <p className="text-foreground font-medium">{data.total_scans}</p>
            </div>
            <div>
              <span className="text-muted">Arbs detected</span>
              <p className="text-foreground font-medium">{data.total_arbs_detected}</p>
            </div>
            <div>
              <span className="text-muted">Profitable arbs (&gt;2% spread)</span>
              <p className="text-foreground font-medium">{data.profitable_count}</p>
            </div>
            <div>
              <span className="text-muted">Profitability rate</span>
              <p className="text-foreground font-medium">{data.profitable_pct > 0 ? `${data.profitable_pct.toFixed(1)}%` : '—'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Award, TrendingUp, Zap, BarChart3, RefreshCw, ArrowUpDown, Trophy } from 'lucide-react';

interface LeaderboardData {
  stats: {
    totalArbs: number;
    avgSpread: number;
    bestSpread: number;
    mostFrequentCategory: string;
    profitableRate: number;
  };
  topArbs: Array<{
    id: string;
    event: string;
    spreadPercent: number;
    platformA: string;
    platformB: string;
    category: string;
    detectedAt: string;
  }>;
}

type SortKey = 'spreadPercent' | 'detectedAt';

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('spreadPercent');
  const [sortAsc, setSortAsc] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/history/leaderboard');
      if (!res.ok) throw new Error('Failed');
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(false); }
  };

  const sorted = data?.topArbs
    ? [...data.topArbs].sort((a, b) => {
        const mul = sortAsc ? 1 : -1;
        if (sortBy === 'spreadPercent') return mul * (a.spreadPercent - b.spreadPercent);
        return mul * (new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime());
      })
    : [];

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
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Total Arbs', value: data.stats.totalArbs.toLocaleString(), icon: Zap, color: 'text-gold' },
            { label: 'Avg Spread', value: `${data.stats.avgSpread.toFixed(1)}%`, icon: BarChart3, color: 'text-blue' },
            { label: 'Best Spread', value: `${data.stats.bestSpread.toFixed(1)}%`, icon: TrendingUp, color: 'text-green' },
            { label: 'Top Category', value: data.stats.mostFrequentCategory, icon: Trophy, color: 'text-purple-400' },
            { label: 'Profitable (>2%)', value: `${data.stats.profitableRate.toFixed(0)}%`, icon: Award, color: 'text-gold' },
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
      {!loading && !data?.topArbs?.length && (
        <div className="text-center py-20">
          <Trophy className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">Leaderboard populates as the scanner runs</p>
          <p className="text-xs text-muted">Check back in a few hours.</p>
        </div>
      )}

      {/* Table */}
      {sorted.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">🏆 Top Arbs of All Time</h2>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted">
                    <th className="text-left p-4">#</th>
                    <th className="text-left p-4">Event</th>
                    <th className="text-left p-4 cursor-pointer select-none" onClick={() => toggleSort('spreadPercent')}>
                      <span className="flex items-center gap-1">Spread <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="text-left p-4">Platforms</th>
                    <th className="text-left p-4">Category</th>
                    <th className="text-left p-4 cursor-pointer select-none" onClick={() => toggleSort('detectedAt')}>
                      <span className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((arb, i) => (
                    <tr key={arb.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-muted">{i + 1}</td>
                      <td className="p-4 text-foreground font-medium max-w-[300px] truncate">{arb.event}</td>
                      <td className="p-4">
                        <span className="bg-green/15 text-green px-2 py-0.5 rounded-full text-xs font-bold">
                          {arb.spreadPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-4 text-muted">{arb.platformA} / {arb.platformB}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-blue/10 text-blue text-[10px] font-medium">{arb.category}</span>
                      </td>
                      <td className="p-4 text-muted text-xs">{new Date(arb.detectedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

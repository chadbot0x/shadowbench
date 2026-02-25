'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, TrendingUp, Zap, Filter, RefreshCw, ExternalLink, Search } from 'lucide-react';

interface ArbitrageOpp {
  id: string;
  event: string;
  category: string;
  platformA: string;
  platformB: string;
  priceA: number;
  priceB: number;
  spreadPercent: number;
  confidence: string;
  deepLinkA?: string;
  deepLinkB?: string;
}

interface ScanEntry {
  timestamp: string;
  scan_time_ms: number;
  markets_scanned: number;
  opportunities: ArbitrageOpp[];
}

interface HistoryAPIResponse {
  hours: number;
  entries: number;
  history: ScanEntry[];
}

interface FlatEntry extends ArbitrageOpp {
  detectedAt: string;
}

const TIME_RANGES = [
  { label: '1h', hours: 1 },
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
  { label: '7d', hours: 168 },
] as const;

export default function HistoryPage() {
  const [raw, setRaw] = useState<HistoryAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [minSpread, setMinSpread] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('All');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/history?hours=${hours}`);
      if (!res.ok) throw new Error('Failed');
      const result: HistoryAPIResponse = await res.json();
      setRaw(result);
    } catch {
      setRaw(null);
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Flatten scan entries into individual arb opportunities
  const allEntries: FlatEntry[] = useMemo(() => {
    if (!raw?.history) return [];
    const flat: FlatEntry[] = [];
    for (const scan of raw.history) {
      for (const opp of scan.opportunities) {
        flat.push({ ...opp, detectedAt: scan.timestamp });
      }
    }
    return flat.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
  }, [raw]);

  const summary = useMemo(() => {
    if (!allEntries.length) return { total: 0, avgSpread: 0, bestSpread: 0 };
    const spreads = allEntries.map(e => e.spreadPercent);
    return {
      total: allEntries.length,
      avgSpread: spreads.reduce((a, b) => a + b, 0) / spreads.length,
      bestSpread: Math.max(...spreads),
    };
  }, [allEntries]);

  const scanCount = raw?.history?.length ?? 0;

  const categories = useMemo(() => {
    if (!allEntries.length) return ['All'];
    const cats = new Set(allEntries.map(e => e.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [allEntries]);

  const filtered = useMemo(() => {
    let result = allEntries;
    if (categoryFilter !== 'All') result = result.filter(e => e.category === categoryFilter);
    if (minSpread > 0) result = result.filter(e => e.spreadPercent >= minSpread);
    return result;
  }, [allEntries, categoryFilter, minSpread]);

  const rangeLabel = TIME_RANGES.find(r => r.hours === hours)?.label ?? '24h';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-6 h-6 text-blue" />
        <h1 className="text-2xl font-bold text-foreground">History</h1>
        <button onClick={fetchData} className="ml-auto flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: `Scans (${rangeLabel})`, value: scanCount, icon: Clock, color: 'text-muted' },
          { label: `Arbs found`, value: summary.total || '—', icon: Zap, color: 'text-gold' },
          { label: 'Avg Spread', value: summary.avgSpread ? `${summary.avgSpread.toFixed(1)}%` : '—', icon: Filter, color: 'text-blue' },
          { label: 'Best Spread', value: summary.bestSpread ? `${summary.bestSpread.toFixed(1)}%` : '—', icon: TrendingUp, color: 'text-green' },
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1">
          {TIME_RANGES.map(r => (
            <button
              key={r.hours}
              onClick={() => setHours(r.hours)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                hours === r.hours ? 'bg-blue/15 text-blue' : 'text-muted hover:text-foreground hover:bg-white/5'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <select
          value={minSpread}
          onChange={e => setMinSpread(Number(e.target.value))}
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
        >
          <option value={0}>Min Spread: Any</option>
          <option value={2}>Min Spread: 2%</option>
          <option value={5}>Min Spread: 5%</option>
          <option value={10}>Min Spread: 10%</option>
        </select>
        {categories.length > 1 && (
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Loading */}
      {loading && !raw && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-6 animate-pulse">
              <div className="h-5 bg-border rounded w-3/4 mb-4" />
              <div className="h-10 bg-border rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <Search className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">
            {allEntries.length === 0 ? 'Scanner is collecting data' : 'No arbs match your filters'}
          </p>
          <p className="text-xs text-muted">
            {allEntries.length === 0
              ? `${scanCount} scans completed so far. Arbs will appear here when cross-platform price gaps are detected.`
              : 'Try adjusting the time range or minimum spread filter.'}
          </p>
        </div>
      )}

      {/* Entries */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map((entry, i) => (
            <motion.div
              key={`${entry.id}-${entry.detectedAt}-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="bg-surface border border-border hover:border-gold/20 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground mb-1 truncate">{entry.event}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    {entry.category && (
                      <span className="px-2 py-0.5 rounded bg-blue/10 text-blue text-[10px] font-medium">{entry.category}</span>
                    )}
                    <span>{entry.platformA} {entry.priceA ? `${(entry.priceA * 100).toFixed(0)}¢` : ''} vs {entry.platformB} {entry.priceB ? `${(entry.priceB * 100).toFixed(0)}¢` : ''}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(entry.detectedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1 bg-green/15 text-green px-3 py-1 rounded-full text-sm font-bold">
                    <TrendingUp className="w-3 h-3" />
                    {entry.spreadPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              {(entry.deepLinkA || entry.deepLinkB) && (
                <div className="flex gap-3 mt-3">
                  {entry.deepLinkA && (
                    <a href={entry.deepLinkA} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue hover:underline flex items-center gap-1">
                      {entry.platformA} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {entry.deepLinkB && (
                    <a href={entry.deepLinkB} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue hover:underline flex items-center gap-1">
                      {entry.platformB} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

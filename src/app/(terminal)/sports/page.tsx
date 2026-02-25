'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RefreshCw, TrendingUp, Clock, Zap, ExternalLink, Loader2, Calendar, Newspaper, Activity } from 'lucide-react';
import type { ArbitrageOpportunity } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SportsResponse {
  opportunities: (ArbitrageOpportunity & { sport?: string; matchup?: string })[];
  metadata: { scan_time_ms: number; markets_scanned: number; matches_found: number };
}

interface SportEvent {
  id: string;
  league: 'NBA' | 'NFL' | 'MLB' | 'NHL';
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: 'scheduled' | 'in_progress' | 'final';
  score?: { home: number; away: number };
  venue?: string;
  broadcast?: string;
  hasPolymarket: boolean;
  hasKalshi: boolean;
  polymarketSlug?: string;
  kalshiTicker?: string;
}

interface SportsArticle {
  id: string;
  headline: string;
  description: string;
  published: string;
  league: string;
  link: string;
  image?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'arbs', label: 'Arbs', icon: Zap },
  { id: 'news', label: 'News', icon: Newspaper },
] as const;

type TabId = typeof TABS[number]['id'];

const LEAGUE_EMOJI: Record<string, string> = { NBA: '🏀', NFL: '🏈', MLB: '⚾', NHL: '🏒' };
const LEAGUE_FILTERS = ['All', 'NBA', 'NFL', 'MLB', 'NHL'] as const;

const SPORT_COLORS: Record<string, string> = {
  NBA: 'bg-orange-500/15 text-orange-400',
  NFL: 'bg-green/15 text-green',
  MLB: 'bg-red/15 text-red',
  NHL: 'bg-blue/15 text-blue',
  Soccer: 'bg-emerald-500/15 text-emerald-400',
  MMA: 'bg-purple-500/15 text-purple-400',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── Schedule Tab ────────────────────────────────────────────────────────────

function ScheduleTab() {
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [leagueFilter, setLeagueFilter] = useState('All');

  useEffect(() => {
    fetch('/api/sports/events')
      .then(r => r.ok ? r.json() : { events: [] })
      .then(d => setEvents(d.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (leagueFilter === 'All') return events;
    return events.filter(e => e.league === leagueFilter);
  }, [events, leagueFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading schedule...</span>
      </div>
    );
  }

  return (
    <div>
      {/* League filters */}
      <div className="flex flex-wrap gap-1 mb-5">
        {LEAGUE_FILTERS.map(l => (
          <button
            key={l}
            onClick={() => setLeagueFilter(l)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              leagueFilter === l ? 'bg-gold/15 text-gold' : 'text-muted hover:text-foreground hover:bg-white/5'
            }`}
          >
            {l !== 'All' && `${LEAGUE_EMOJI[l]} `}{l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">No games scheduled</p>
          <p className="text-xs text-muted">Check back closer to game time for today&apos;s schedule.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="bg-surface border border-border hover:border-gold/20 rounded-xl p-4 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* League badge */}
                  <span className="text-xl w-8 text-center flex-shrink-0">{LEAGUE_EMOJI[ev.league] || '🏅'}</span>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground text-sm truncate">
                        {ev.awayTeam} vs {ev.homeTeam}
                      </span>
                      {/* Status badge */}
                      {ev.status === 'in_progress' && (
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-green/15 text-green font-medium flex-shrink-0">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green" />
                          </span>
                          LIVE
                        </span>
                      )}
                      {ev.status === 'final' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/15 text-muted font-medium flex-shrink-0">✅ Final</span>
                      )}
                      {ev.status === 'scheduled' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue/10 text-blue font-medium flex-shrink-0">⏰ {formatTime(ev.startTime)}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span>{formatDate(ev.startTime)}</span>
                      {ev.score && (
                        <span className="font-bold text-foreground">
                          {ev.score.away} - {ev.score.home}
                        </span>
                      )}
                      {ev.broadcast && <span>· {ev.broadcast}</span>}
                      {ev.venue && <span className="hidden md:inline">· {ev.venue}</span>}
                    </div>
                  </div>

                  {/* Market badges */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {ev.hasPolymarket && (
                      <a
                        href={ev.polymarketSlug ? `https://polymarket.com/event/${ev.polymarketSlug}` : 'https://polymarket.com'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] px-2 py-1 rounded bg-green/10 text-green hover:bg-green/20 transition-colors"
                      >
                        📊 Poly
                      </a>
                    )}
                    {ev.hasKalshi && (
                      <a
                        href={ev.kalshiTicker ? `https://kalshi.com/markets/${ev.kalshiTicker}` : 'https://kalshi.com'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] px-2 py-1 rounded bg-blue/10 text-blue hover:bg-blue/20 transition-colors"
                      >
                        📊 Kalshi
                      </a>
                    )}
                    {!ev.hasPolymarket && !ev.hasKalshi && (
                      <span className="text-[10px] text-muted/50">No markets</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ─── Arbs Tab ────────────────────────────────────────────────────────────────

function ArbsTab() {
  const [data, setData] = useState<SportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState('All');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const SPORTS = ['All', 'NBA', 'NFL', 'MLB', 'NHL', 'Soccer', 'MMA'] as const;

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
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Sports Arbs', value: data?.metadata?.matches_found ?? '—', icon: Zap, color: 'text-gold' },
          { label: 'Best Spread', value: bestSpread ? `${bestSpread.toFixed(1)}%` : '—', icon: TrendingUp, color: 'text-green' },
          { label: 'Last Scan', value: lastUpdated ? lastUpdated.toLocaleTimeString() : '—', icon: Clock, color: 'text-muted' },
        ].map(stat => (
          <div key={stat.label} className="bg-surface border border-border rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              <span className="text-[10px] text-muted">{stat.label}</span>
            </div>
            <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1 mb-5">
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

      {loading && !data && (
        <div className="flex items-center justify-center py-20 gap-2 text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Scanning sports markets...</span>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Trophy className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">No sports arbs right now</p>
          <p className="text-xs text-muted max-w-md mx-auto">
            Sports arbitrage opportunities appear when prediction market prices diverge across platforms.
            Markets are most active on game days — check back during NBA, NFL, MLB, or NHL games.
          </p>
        </div>
      )}

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
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-foreground leading-snug mb-2">
                        {arb.matchup || arb.event}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${colorClass}`}>{sport}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          arb.type === 'cross-platform' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue/10 text-blue'
                        }`}>
                          {arb.type === 'cross-platform' ? 'Cross-Platform' : 'Intra-Market'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-green/5 border border-green/20 rounded-xl p-3 text-center">
                      <div className="text-xs text-muted mb-1">{arb.platformA}</div>
                      <div className="text-xl font-bold text-green">{(arb.platformAPrice * 100).toFixed(1)}¢</div>
                    </div>
                    <div className="bg-red/5 border border-red/20 rounded-xl p-3 text-center">
                      <div className="text-xs text-muted mb-1">{arb.platformB}</div>
                      <div className="text-xl font-bold text-red">{(arb.platformBPrice * 100).toFixed(1)}¢</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center mb-4">
                    <span className="inline-flex items-center gap-2 bg-green/15 text-green px-4 py-2 rounded-full text-sm font-bold">
                      <TrendingUp className="w-4 h-4" />
                      {arb.spreadPercent.toFixed(1)}% Spread
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <a href={arb.deepLinkA || 'https://polymarket.com'} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-green/15 hover:bg-green/25 text-green font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors">
                      {arb.platformA} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a href={arb.deepLinkB || 'https://kalshi.com'} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-blue/15 hover:bg-blue/25 text-blue font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors">
                      {arb.platformB} <ExternalLink className="w-3.5 h-3.5" />
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

// ─── News Tab ────────────────────────────────────────────────────────────────

function NewsTab() {
  const [articles, setArticles] = useState<SportsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sports/news')
      .then(r => r.ok ? r.json() : { articles: [] })
      .then(d => setArticles(d.articles || []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading news...</span>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-muted mb-4">Sports news that could move markets</p>

      {articles.length === 0 ? (
        <div className="text-center py-16">
          <Newspaper className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">No news right now</p>
          <p className="text-xs text-muted">ESPN headlines will appear here when available.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {articles.map((article, i) => (
            <motion.a
              key={article.id}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground group-hover:text-gold transition-colors leading-snug mb-1">
                  {article.headline}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-muted">
                  <span className={`px-1.5 py-0.5 rounded font-medium ${SPORT_COLORS[article.league] || 'bg-blue/10 text-blue'}`}>
                    {LEAGUE_EMOJI[article.league] || '🏅'} {article.league}
                  </span>
                  <span>{timeAgo(article.published)}</span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted group-hover:text-gold mt-1 flex-shrink-0 transition-colors" />
            </motion.a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('schedule');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-gold" />
        <h1 className="text-2xl font-bold text-foreground">Sports</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-2 text-xs text-green">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green" />
            </span>
            Live
          </span>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 bg-surface border border-border rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-gold/15 text-gold'
                : 'text-muted hover:text-foreground hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'schedule' && <ScheduleTab />}
      {activeTab === 'arbs' && <ArbsTab />}
      {activeTab === 'news' && <NewsTab />}
    </div>
  );
}

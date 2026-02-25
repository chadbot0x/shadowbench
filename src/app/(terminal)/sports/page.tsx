'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, RefreshCw, TrendingUp, Clock, Zap, ExternalLink, Loader2,
  Calendar, Newspaper, Activity, ChevronDown, ChevronUp, BarChart3,
  AlertTriangle,
} from 'lucide-react';
import type { ArbitrageOpportunity } from '@/types';

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */

interface TeamInfo { name: string; record?: string; logo?: string; score?: number }

interface SportEvent {
  id: string;
  espnId: string;
  league: 'NBA' | 'NFL' | 'MLB' | 'NHL';
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  startTime: string;
  status: 'scheduled' | 'in_progress' | 'final';
  statusDetail?: string;
  venue?: string;
  broadcast?: string;
  hasPolymarket: boolean;
  hasKalshi: boolean;
  polymarketSlug?: string;
  kalshiTicker?: string;
  odds?: { spread?: string; overUnder?: string; moneyline?: { home: string; away: string } };
  topPerformers?: { name: string; team: string; statLine: string }[];
  teamStats?: { home: Record<string, string>; away: Record<string, string> };
  winProbability?: { home: number; away: number };
  injuries?: { team: string; player: string; status: string }[];
}

interface SportsArticle {
  id: string; headline: string; description: string; published: string;
  league: string; link: string; image?: string;
}

interface SportsResponse {
  opportunities: (ArbitrageOpportunity & { sport?: string; matchup?: string })[];
  metadata: { scan_time_ms: number; markets_scanned: number; matches_found: number };
}

interface StatLeader { name: string; team: string; value: string; headshot?: string }
interface LeagueStats {
  league: string;
  categories: { name: string; displayName: string; leaders: StatLeader[] }[];
}

/* ═══════════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════════ */

const TABS = [
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'arbs', label: 'Arbs', icon: Zap },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
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

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════════════════
   Game Card (expandable)
   ═══════════════════════════════════════════════════════════════════════════ */

function GameCard({ ev }: { ev: SportEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-surface border border-border hover:border-gold/20 rounded-xl transition-colors overflow-hidden">
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left"
      >
        {/* Row 1: Teams */}
        <div className="flex items-center gap-3 mb-2">
          {/* Away team */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {ev.awayTeam.logo ? (
              <img src={ev.awayTeam.logo} alt="" className="w-6 h-6 flex-shrink-0" />
            ) : (
              <span className="text-base flex-shrink-0">{LEAGUE_EMOJI[ev.league] || '🏅'}</span>
            )}
            <span className="font-semibold text-foreground text-sm">{ev.awayTeam.name}</span>
            {ev.awayTeam.score != null && <span className="font-bold text-foreground text-lg ml-auto">{ev.awayTeam.score}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 mb-2">
          {/* Home team */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {ev.homeTeam.logo ? (
              <img src={ev.homeTeam.logo} alt="" className="w-6 h-6 flex-shrink-0" />
            ) : (
              <span className="text-base flex-shrink-0">{LEAGUE_EMOJI[ev.league] || '🏅'}</span>
            )}
            <span className="font-semibold text-foreground text-sm">{ev.homeTeam.name}</span>
            {ev.homeTeam.score != null && <span className="font-bold text-foreground text-lg ml-auto">{ev.homeTeam.score}</span>}
          </div>
        </div>

        {/* Row 2: Meta line */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status badge */}
          {ev.status === 'in_progress' && (
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red/15 text-red font-medium">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red" />
              </span>
              {ev.statusDetail || 'LIVE'}
            </span>
          )}
          {ev.status === 'final' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/15 text-muted font-medium">Final</span>
          )}
          {ev.status === 'scheduled' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue/10 text-blue font-medium">
              ⏰ {formatTime(ev.startTime)}
            </span>
          )}

          <span className="text-xs text-muted">{formatDate(ev.startTime)}</span>
          {ev.homeTeam.record && <span className="text-xs text-muted">· {ev.homeTeam.record}</span>}
          {ev.odds?.spread && <span className="text-xs text-muted">· {ev.odds.spread}</span>}

          <div className="ml-auto flex items-center gap-1.5">
            {ev.hasPolymarket && (
              <span className="text-[10px] px-2 py-1 rounded bg-green/10 text-green font-medium">Poly</span>
            )}
            {ev.hasKalshi && (
              <span className="text-[10px] px-2 py-1 rounded bg-blue/10 text-blue font-medium">Kalshi</span>
            )}
            {!ev.hasPolymarket && !ev.hasKalshi && (
              <span className="text-[10px] text-muted/50">No markets</span>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border pt-3 space-y-4">

              {/* Win probability bar */}
              {ev.winProbability && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted">{ev.awayTeam.name} {ev.winProbability.away}%</span>
                    <span className="text-[10px] text-muted/60 uppercase">Win Probability</span>
                    <span className="text-muted">{ev.homeTeam.name} {ev.winProbability.home}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden flex">
                    <div className="bg-blue h-full transition-all" style={{ width: `${ev.winProbability.away}%` }} />
                    <div className="bg-gold h-full transition-all" style={{ width: `${ev.winProbability.home}%` }} />
                  </div>
                </div>
              )}

              {/* Odds detail */}
              {ev.odds && (ev.odds.spread || ev.odds.moneyline) && (
                <div className="grid grid-cols-3 gap-2">
                  {ev.odds.spread && (
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-muted mb-0.5">Spread</div>
                      <div className="text-sm font-medium text-foreground">{ev.odds.spread}</div>
                    </div>
                  )}
                  {ev.odds.overUnder && (
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-muted mb-0.5">Total</div>
                      <div className="text-sm font-medium text-foreground">{ev.odds.overUnder}</div>
                    </div>
                  )}
                  {ev.odds.moneyline && (
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-muted mb-0.5">Moneyline</div>
                      <div className="text-xs font-medium text-foreground">
                        {ev.awayTeam.name.split(' ').pop()} {ev.odds.moneyline.away} / {ev.homeTeam.name.split(' ').pop()} {ev.odds.moneyline.home}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Top performers */}
              {ev.topPerformers && ev.topPerformers.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Top Performers
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {ev.topPerformers.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1">
                        <span className="text-foreground font-medium truncate">{p.name}</span>
                        <span className="text-muted/60 text-[10px]">{p.team.split(' ').pop()}</span>
                        <span className="ml-auto text-gold font-mono text-[11px] flex-shrink-0">{p.statLine}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team stats comparison */}
              {ev.teamStats && (Object.keys(ev.teamStats.home).length > 0 || Object.keys(ev.teamStats.away).length > 0) && (
                <div>
                  <h4 className="text-xs font-medium text-muted mb-2">Team Stats</h4>
                  <div className="space-y-1">
                    {Object.keys(ev.teamStats.home).slice(0, 8).map(key => (
                      <div key={key} className="flex items-center text-xs">
                        <span className="w-16 text-right font-mono text-foreground">{ev.teamStats!.away[key] || '—'}</span>
                        <span className="flex-1 text-center text-muted/60 text-[10px] uppercase px-2 truncate">{key}</span>
                        <span className="w-16 text-left font-mono text-foreground">{ev.teamStats!.home[key] || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Injuries */}
              {ev.injuries && ev.injuries.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> Injuries
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {ev.injuries.map((inj, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                        <span className="text-foreground truncate">{inj.player}</span>
                        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                          inj.status.toLowerCase().includes('out') ? 'bg-red/15 text-red' :
                          inj.status.toLowerCase().includes('day') ? 'bg-orange-500/15 text-orange-400' :
                          'bg-yellow-500/15 text-yellow-400'
                        }`}>
                          {inj.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Market links */}
              {(ev.hasPolymarket || ev.hasKalshi) && (
                <div className="flex gap-2 pt-1">
                  {ev.hasPolymarket && (
                    <a
                      href={ev.polymarketSlug ? `https://polymarket.com/event/${ev.polymarketSlug}` : 'https://polymarket.com'}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs bg-green/10 hover:bg-green/20 text-green px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Trade on Polymarket <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {ev.hasKalshi && (
                    <a
                      href={ev.kalshiTicker ? `https://kalshi.com/markets/${ev.kalshiTicker}` : 'https://kalshi.com'}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs bg-blue/10 hover:bg-blue/20 text-blue px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Trade on Kalshi <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Venue */}
              {ev.venue && (
                <div className="text-[10px] text-muted/50 pt-1">📍 {ev.venue}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Schedule Tab
   ═══════════════════════════════════════════════════════════════════════════ */

function ScheduleTab() {
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [leagueFilter, setLeagueFilter] = useState('All');

  const fetchEvents = useCallback(async () => {
    try {
      const r = await fetch('/api/sports/events');
      if (!r.ok) throw new Error();
      const d = await r.json();
      setEvents(d.events || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 15000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const filtered = useMemo(() => {
    let result = events.filter(e => e.status !== 'final');
    if (leagueFilter !== 'All') result = result.filter(e => e.league === leagueFilter);
    return result;
  }, [events, leagueFilter]);

  const liveCount = events.filter(e => e.status === 'in_progress').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted">
        <Loader2 className="w-5 h-5 animate-spin" /> <span className="text-sm">Loading schedule...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Filters + live count */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex flex-wrap gap-1">
          {LEAGUE_FILTERS.map(l => (
            <button key={l} onClick={() => setLeagueFilter(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                leagueFilter === l ? 'bg-gold/15 text-gold' : 'text-muted hover:text-foreground hover:bg-white/5'
              }`}>
              {l !== 'All' && `${LEAGUE_EMOJI[l]} `}{l}
            </button>
          ))}
        </div>
        {liveCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-red font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red" />
            </span>
            {liveCount} Live
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">No games scheduled</p>
          <p className="text-xs text-muted">Check back closer to game time for today&apos;s schedule.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ev, i) => (
            <motion.div key={ev.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <GameCard ev={ev} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Arbs Tab
   ═══════════════════════════════════════════════════════════════════════════ */

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
    } catch { setData(null); } finally { setLoading(false); }
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

      <div className="flex flex-wrap gap-1 mb-5">
        {SPORTS.map(s => (
          <button key={s} onClick={() => setSportFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              sportFilter === s ? 'bg-gold/15 text-gold' : 'text-muted hover:text-foreground hover:bg-white/5'
            }`}>{s}</button>
        ))}
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-20 gap-2 text-muted">
          <Loader2 className="w-5 h-5 animate-spin" /> <span className="text-sm">Scanning sports markets...</span>
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
              <motion.div key={arb.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }} transition={{ delay: i * 0.03 }}
                className="bg-surface border border-border hover:border-gold/20 rounded-2xl overflow-hidden transition-colors">
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-foreground leading-snug mb-2">{arb.matchup || arb.event}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${colorClass}`}>{sport}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          arb.type === 'cross-platform' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue/10 text-blue'
                        }`}>{arb.type === 'cross-platform' ? 'Cross-Platform' : 'Intra-Market'}</span>
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
                      <TrendingUp className="w-4 h-4" /> {arb.spreadPercent.toFixed(1)}% Spread
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

/* ═══════════════════════════════════════════════════════════════════════════
   News Tab
   ═══════════════════════════════════════════════════════════════════════════ */

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
        <Loader2 className="w-5 h-5 animate-spin" /> <span className="text-sm">Loading news...</span>
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
            <motion.a key={article.id} href={article.link} target="_blank" rel="noopener noreferrer"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface transition-colors group">
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

/* ═══════════════════════════════════════════════════════════════════════════
   Stats Tab
   ═══════════════════════════════════════════════════════════════════════════ */

function StatsTab() {
  const [data, setData] = useState<LeagueStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLeague, setActiveLeague] = useState('NBA');

  useEffect(() => {
    fetch('/api/sports/stats')
      .then(r => r.ok ? r.json() : { leagues: [] })
      .then(d => {
        setData(d.leagues || []);
        if (d.leagues?.length > 0 && !d.leagues.find((l: LeagueStats) => l.league === activeLeague)) {
          setActiveLeague(d.leagues[0].league);
        }
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted">
        <Loader2 className="w-5 h-5 animate-spin" /> <span className="text-sm">Loading stats...</span>
      </div>
    );
  }

  const league = data.find(l => l.league === activeLeague);
  const availableLeagues = data.map(l => l.league);

  return (
    <div>
      <p className="text-xs text-muted mb-4">League stat leaders — useful context for informed bets</p>

      {/* League switcher */}
      <div className="flex flex-wrap gap-1 mb-5">
        {availableLeagues.map(l => (
          <button key={l} onClick={() => setActiveLeague(l)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeLeague === l ? 'bg-gold/15 text-gold' : 'text-muted hover:text-foreground hover:bg-white/5'
            }`}>
            {LEAGUE_EMOJI[l] || '🏅'} {l}
          </button>
        ))}
      </div>

      {!league || league.categories.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">No stats available</p>
          <p className="text-xs text-muted">Season stats will appear here when the league is active.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {league.categories.map(cat => (
            <div key={cat.name} className="bg-surface border border-border rounded-xl p-4">
              <h4 className="text-xs font-medium text-gold mb-3 uppercase tracking-wide">{cat.displayName}</h4>
              <div className="space-y-1.5">
                {cat.leaders.map((leader, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={`w-5 text-center font-mono ${i === 0 ? 'text-gold' : i < 3 ? 'text-foreground' : 'text-muted'}`}>
                      {i + 1}
                    </span>
                    <span className="text-foreground font-medium truncate flex-1">{leader.name}</span>
                    <span className="text-muted/60 text-[10px]">{leader.team}</span>
                    <span className="font-mono text-gold text-[11px] ml-1">{leader.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════════════════ */

export default function SportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('schedule');

  return (
    <div>
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

      <div className="flex gap-1 mb-6 bg-surface border border-border rounded-xl p-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.id ? 'bg-gold/15 text-gold' : 'text-muted hover:text-foreground hover:bg-white/5'
            }`}>
            <tab.icon className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.slice(0, 4)}</span>
          </button>
        ))}
      </div>

      {activeTab === 'schedule' && <ScheduleTab />}
      {activeTab === 'arbs' && <ArbsTab />}
      {activeTab === 'news' && <NewsTab />}
      {activeTab === 'stats' && <StatsTab />}
    </div>
  );
}

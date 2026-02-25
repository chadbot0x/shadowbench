import { NextResponse } from 'next/server';

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface TeamInfo {
  name: string;
  record?: string;
  logo?: string;
  score?: number;
}

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

/* ── ESPN endpoints ────────────────────────────────────────────────────────── */

const LEAGUES: { league: SportEvent['league']; sport: string; path: string }[] = [
  { league: 'NBA', sport: 'basketball', path: 'basketball/nba' },
  { league: 'NFL', sport: 'football', path: 'football/nfl' },
  { league: 'MLB', sport: 'baseball', path: 'baseball/mlb' },
  { league: 'NHL', sport: 'hockey', path: 'hockey/nhl' },
];

let cache: { data: any; expiry: number } | null = null;

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function parseStatus(name: string): SportEvent['status'] {
  const s = (name || '').toLowerCase();
  if (s === 'in' || s.includes('progress') || s.includes('halftime')) return 'in_progress';
  if (s === 'post' || s === 'final') return 'final';
  return 'scheduled';
}

function safeNum(v: any): number | undefined {
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
}

/* ── Fetch scoreboard for a league ─────────────────────────────────────────── */

async function fetchScoreboard(cfg: typeof LEAGUES[number]): Promise<SportEvent[]> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${cfg.path}/scoreboard`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    const events: SportEvent[] = [];

    for (const event of data?.events || []) {
      const comp = event.competitions?.[0];
      if (!comp) continue;

      const homeRaw = comp.competitors?.find((c: any) => c.homeAway === 'home');
      const awayRaw = comp.competitors?.find((c: any) => c.homeAway === 'away');
      if (!homeRaw || !awayRaw) continue;

      const statusName = comp.status?.type?.name || event.status?.type?.name || '';
      const status = parseStatus(statusName);
      const statusDetail = comp.status?.type?.shortDetail || event.status?.type?.shortDetail;

      const makeTeam = (raw: any): TeamInfo => ({
        name: raw.team?.displayName || raw.team?.name || 'TBD',
        record: raw.records?.[0]?.summary,
        logo: raw.team?.logo,
        score: (status === 'in_progress' || status === 'final') ? parseInt(raw.score || '0', 10) : undefined,
      });

      // Odds from scoreboard
      let odds: SportEvent['odds'] | undefined;
      const oddsData = comp.odds?.[0];
      if (oddsData) {
        odds = {
          spread: oddsData.details,
          overUnder: oddsData.overUnder != null ? `O/U ${oddsData.overUnder}` : undefined,
          moneyline: undefined,
        };
        // homeTeamOdds / awayTeamOdds sometimes present
        const hml = oddsData.homeTeamOdds?.moneyLine;
        const aml = oddsData.awayTeamOdds?.moneyLine;
        if (hml != null && aml != null) {
          odds.moneyline = { home: String(hml), away: String(aml) };
        }
      }

      events.push({
        id: `${cfg.league}-${event.id}`,
        espnId: event.id,
        league: cfg.league,
        homeTeam: makeTeam(homeRaw),
        awayTeam: makeTeam(awayRaw),
        startTime: event.date || comp.date,
        status,
        statusDetail,
        venue: comp.venue ? (comp.venue.fullName || comp.venue.name) : undefined,
        broadcast: comp.broadcasts?.flatMap((b: any) => b.names || []).join(', ') || undefined,
        odds,
        hasPolymarket: false,
        hasKalshi: false,
      });
    }
    return events;
  } catch {
    return [];
  }
}

/* ── Fetch detailed game summary (boxscore, win prob, injuries) ────────── */

async function enrichEvent(ev: SportEvent, leaguePath: string): Promise<void> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${leaguePath}/summary?event=${ev.espnId}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return;
    const data = await res.json();

    // ── Top performers from boxscore ──
    const boxscore = data.boxscore;
    if (boxscore?.players) {
      const performers: SportEvent['topPerformers'] = [];

      for (const teamBlock of boxscore.players) {
        const teamName: string = teamBlock.team?.displayName || teamBlock.team?.shortDisplayName || '';
        const stats = teamBlock.statistics?.[0]; // first stat category (usually main)
        if (!stats?.athletes) continue;

        // Sort by points (first stat column for NBA) or use the raw order (ESPN often pre-sorts)
        const athletes = stats.athletes.slice(0, 3);
        for (const ath of athletes) {
          const name: string = ath.athlete?.displayName || ath.athlete?.shortName || '';
          const statLine = buildStatLine(ev.league, stats.labels, ath.stats);
          if (name && statLine) {
            performers.push({ name, team: teamName, statLine });
          }
        }
      }
      if (performers.length > 0) ev.topPerformers = performers;
    }

    // ── Team stats ──
    if (boxscore?.teams) {
      const home: Record<string, string> = {};
      const away: Record<string, string> = {};

      for (const teamBlock of boxscore.teams) {
        const isHome = teamBlock.homeAway === 'home';
        const target = isHome ? home : away;
        for (const statGroup of teamBlock.statistics || []) {
          if (statGroup.displayValue != null) {
            target[statGroup.label || statGroup.name || ''] = statGroup.displayValue;
          }
        }
      }
      if (Object.keys(home).length > 0 || Object.keys(away).length > 0) {
        ev.teamStats = { home, away };
      }
    }

    // ── Win probability ──
    const winProb = data.winprobability;
    if (winProb && winProb.length > 0) {
      const latest = winProb[winProb.length - 1];
      const homeProb = safeNum(latest.homeWinPercentage);
      if (homeProb != null) {
        ev.winProbability = { home: Math.round(homeProb * 100), away: Math.round((1 - homeProb) * 100) };
      }
    }

    // ── Injuries ──
    const injuryData = data.injuries;
    if (injuryData && Array.isArray(injuryData)) {
      const injuries: SportEvent['injuries'] = [];
      for (const teamInjury of injuryData) {
        const teamName: string = teamInjury.team?.displayName || '';
        for (const entry of teamInjury.injuries || []) {
          injuries.push({
            team: teamName,
            player: entry.athlete?.displayName || entry.athlete?.shortName || 'Unknown',
            status: entry.status || entry.type || 'Unknown',
          });
        }
      }
      if (injuries.length > 0) ev.injuries = injuries.slice(0, 10);
    }
  } catch { /* non-critical */ }
}

function buildStatLine(league: string, labels: string[] | undefined, stats: string[] | undefined): string {
  if (!labels || !stats) return '';

  const get = (key: string): string | undefined => {
    const variants = [key, key.toUpperCase(), key.toLowerCase()];
    for (const v of variants) {
      const idx = labels.indexOf(v);
      if (idx !== -1 && stats[idx] != null) return stats[idx];
    }
    return undefined;
  };

  switch (league) {
    case 'NBA': {
      const pts = get('PTS') || get('points');
      const reb = get('REB') || get('rebounds');
      const ast = get('AST') || get('assists');
      const parts = [];
      if (pts) parts.push(`${pts}pts`);
      if (reb) parts.push(`${reb}reb`);
      if (ast) parts.push(`${ast}ast`);
      return parts.join('/');
    }
    case 'NFL': {
      // Passing or rushing
      const passYds = get('YDS') || get('passing yards');
      const td = get('TD') || get('touchdowns');
      const parts = [];
      if (passYds) parts.push(`${passYds}yds`);
      if (td) parts.push(`${td}td`);
      return parts.join('/');
    }
    case 'MLB': {
      const h = get('H') || get('hits');
      const rbi = get('RBI');
      const hr = get('HR') || get('home runs');
      const parts = [];
      if (h) parts.push(`${h}H`);
      if (rbi) parts.push(`${rbi}RBI`);
      if (hr && hr !== '0') parts.push(`${hr}HR`);
      return parts.join('/');
    }
    case 'NHL': {
      const g = get('G') || get('goals');
      const a = get('A') || get('assists');
      const pts = get('PTS') || get('points');
      const parts = [];
      if (g) parts.push(`${g}G`);
      if (a) parts.push(`${a}A`);
      if (pts) parts.push(`${pts}P`);
      return parts.join('/');
    }
    default:
      return stats.slice(0, 3).join('/');
  }
}

/* ── Check prediction markets ──────────────────────────────────────────────── */

async function checkMarkets(events: SportEvent[]): Promise<void> {
  const matchTeam = (ev: SportEvent, text: string): boolean => {
    const t = text.toLowerCase();
    const hw = ev.homeTeam.name.toLowerCase().split(' ');
    const aw = ev.awayTeam.name.toLowerCase().split(' ');
    return hw.some(w => w.length > 3 && t.includes(w)) || aw.some(w => w.length > 3 && t.includes(w));
  };

  try {
    const res = await fetch('https://gamma-api.polymarket.com/markets?limit=100&order=volume&ascending=false&closed=false&active=true');
    if (res.ok) {
      const markets = await res.json();
      for (const ev of events) {
        for (const m of markets) {
          if (matchTeam(ev, m.question || '')) {
            ev.hasPolymarket = true;
            ev.polymarketSlug = m.slug;
            break;
          }
        }
      }
    }
  } catch { /* ignore */ }

  try {
    const res = await fetch('https://api.elections.kalshi.com/trade-api/v2/events?limit=50&status=open&series_ticker=&with_nested_markets=true', {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      for (const ev of events) {
        for (const ke of data?.events || []) {
          if (matchTeam(ev, ke.title || '')) {
            ev.hasKalshi = true;
            ev.kalshiTicker = ke.event_ticker;
            break;
          }
        }
      }
    }
  } catch { /* ignore */ }
}

/* ── GET handler ───────────────────────────────────────────────────────────── */

export async function GET() {
  const now = Date.now();
  if (cache && cache.expiry > now) {
    return NextResponse.json(cache.data);
  }

  // Fetch all scoreboards
  const results = await Promise.all(LEAGUES.map(l => fetchScoreboard(l)));
  const allEvents = results.flat().sort((a, b) => {
    // Live first, then scheduled, then final
    const statusOrder = { in_progress: 0, scheduled: 1, final: 2 };
    const diff = statusOrder[a.status] - statusOrder[b.status];
    if (diff !== 0) return diff;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  // Enrich live/final games with detailed stats (limit concurrent to avoid hammering ESPN)
  const leagueMap = Object.fromEntries(LEAGUES.map(l => [l.league, l.path]));
  const toEnrich = allEvents.filter(e => e.status === 'in_progress' || e.status === 'final');
  // Also enrich scheduled games for injuries/odds (limit to 8 total to keep response fast)
  const scheduledToEnrich = allEvents.filter(e => e.status === 'scheduled').slice(0, 4);
  const enrichTargets = [...toEnrich, ...scheduledToEnrich].slice(0, 12);

  await Promise.all(enrichTargets.map(ev => enrichEvent(ev, leagueMap[ev.league])));

  // Check prediction markets
  await checkMarkets(allEvents);

  const response = {
    events: allEvents,
    metadata: {
      leagues_scanned: LEAGUES.length,
      events_found: allEvents.length,
      enriched: enrichTargets.length,
      timestamp: new Date().toISOString(),
    },
  };

  cache = { data: response, expiry: now + 60000 };
  return NextResponse.json(response);
}

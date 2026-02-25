import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { ScanResult, ArbitrageOpportunity } from '@/types';

const DATA_DIR = join(process.cwd(), 'data');
const HISTORY_FILE = join(DATA_DIR, 'arb-history.jsonl');
const MAX_LINES = 10_000;

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

interface HistoryEntry {
  timestamp: string;
  scan_time_ms: number;
  markets_scanned: number;
  opportunities: ArbitrageOpportunity[];
}

export function logScanResult(result: ScanResult): void {
  ensureDir();

  const entry: HistoryEntry = {
    timestamp: result.metadata.timestamp,
    scan_time_ms: result.metadata.scan_time_ms,
    markets_scanned: result.metadata.markets_scanned,
    opportunities: result.opportunities,
  };

  appendFileSync(HISTORY_FILE, JSON.stringify(entry) + '\n');

  // Rotate if over limit
  try {
    const content = readFileSync(HISTORY_FILE, 'utf-8');
    const lines = content.trim().split('\n');
    if (lines.length > MAX_LINES) {
      const trimmed = lines.slice(lines.length - MAX_LINES).join('\n') + '\n';
      writeFileSync(HISTORY_FILE, trimmed);
    }
  } catch { /* ignore rotation errors */ }
}

function readEntries(): HistoryEntry[] {
  ensureDir();
  if (!existsSync(HISTORY_FILE)) return [];
  const content = readFileSync(HISTORY_FILE, 'utf-8').trim();
  if (!content) return [];
  return content.split('\n').map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean) as HistoryEntry[];
}

export function getHistory(hours: number): HistoryEntry[] {
  const cutoff = new Date(Date.now() - hours * 3600_000).toISOString();
  return readEntries().filter(e => e.timestamp >= cutoff);
}

export function getLeaderboard() {
  const entries = readEntries();
  const allOpps = entries.flatMap(e => e.opportunities);

  const profitable = allOpps.filter(o => o.spreadPercent > 2);
  const bestArb = allOpps.reduce<ArbitrageOpportunity | null>((best, o) =>
    !best || o.spreadPercent > best.spreadPercent ? o : best, null);

  const avgSpread = allOpps.length > 0
    ? allOpps.reduce((s, o) => s + o.spreadPercent, 0) / allOpps.length
    : 0;

  return {
    total_scans: entries.length,
    total_arbs_detected: allOpps.length,
    avg_spread_pct: Math.round(avgSpread * 100) / 100,
    profitable_count: profitable.length,
    profitable_pct: allOpps.length > 0 ? Math.round((profitable.length / allOpps.length) * 10000) / 100 : 0,
    best_arb: bestArb ? {
      event: bestArb.event,
      spread_pct: Math.round(bestArb.spreadPercent * 100) / 100,
      platforms: `${bestArb.platformA} vs ${bestArb.platformB}`,
      confidence: bestArb.confidence,
    } : null,
    history_entries: entries.length,
  };
}

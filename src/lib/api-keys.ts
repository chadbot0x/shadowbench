import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

const DATA_DIR = join(process.cwd(), 'data');
const KEYS_FILE = join(DATA_DIR, 'api-keys.json');

export type Tier = 'free' | 'pro' | 'api';

interface ApiKeyEntry {
  key: string;
  tier: Tier;
  active: boolean;
  createdAt: string;
  calls: { timestamp: number }[];
}

function ensureFile(): ApiKeyEntry[] {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(KEYS_FILE)) {
    writeFileSync(KEYS_FILE, '[]');
    return [];
  }
  return JSON.parse(readFileSync(KEYS_FILE, 'utf-8'));
}

function save(keys: ApiKeyEntry[]) {
  writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

export function createApiKey(tier: Tier = 'free'): ApiKeyEntry {
  const keys = ensureFile();
  const entry: ApiKeyEntry = {
    key: `sb_${tier}_${crypto.randomBytes(16).toString('hex')}`,
    tier,
    active: true,
    createdAt: new Date().toISOString(),
    calls: [],
  };
  keys.push(entry);
  save(keys);
  return entry;
}

export function validateApiKey(key: string): ApiKeyEntry | null {
  const keys = ensureFile();
  return keys.find(k => k.key === key && k.active) || null;
}

const RATE_LIMITS: Record<Tier, number> = { free: 10, pro: 100, api: Infinity };

export function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const keys = ensureFile();
  const entry = keys.find(k => k.key === key && k.active);
  if (!entry) return { allowed: false, remaining: 0 };

  const hourAgo = Date.now() - 3600_000;
  entry.calls = entry.calls.filter(c => c.timestamp > hourAgo);
  const limit = RATE_LIMITS[entry.tier];
  const allowed = entry.calls.length < limit;

  if (allowed) {
    entry.calls.push({ timestamp: Date.now() });
    save(keys);
  }

  return { allowed, remaining: Math.max(0, limit - entry.calls.length) };
}

/** Middleware helper: returns null if OK, or a Response to send back */
export function enforceApiKey(request: Request): { error: Response } | { entry: ApiKeyEntry } | null {
  const apiKey = request.headers.get('X-API-Key');
  if (!apiKey) return null; // No key = web UI, don't enforce

  const entry = validateApiKey(apiKey);
  if (!entry) return { error: new Response(JSON.stringify({ error: 'Invalid API key' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) };

  const { allowed, remaining } = checkRateLimit(apiKey);
  if (!allowed) return { error: new Response(JSON.stringify({ error: 'Rate limit exceeded', remaining }), { status: 429, headers: { 'Content-Type': 'application/json' } }) };

  return { entry };
}

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import type { ArbitrageOpportunity } from '@/types';

const DATA_DIR = join(process.cwd(), 'data');
const WEBHOOKS_FILE = join(DATA_DIR, 'webhooks.json');

export interface WebhookSubscription {
  id: string;
  apiKey: string;
  url: string;
  min_spread_pct: number;
  categories?: string[];
  platforms?: string[];
  secret?: string;
  createdAt: string;
}

function ensureFile(): WebhookSubscription[] {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(WEBHOOKS_FILE)) {
    writeFileSync(WEBHOOKS_FILE, '[]');
    return [];
  }
  return JSON.parse(readFileSync(WEBHOOKS_FILE, 'utf-8'));
}

function save(hooks: WebhookSubscription[]) {
  writeFileSync(WEBHOOKS_FILE, JSON.stringify(hooks, null, 2));
}

export function listWebhooks(apiKey: string): WebhookSubscription[] {
  return ensureFile().filter(h => h.apiKey === apiKey);
}

export function registerWebhook(apiKey: string, data: {
  url: string;
  min_spread_pct: number;
  categories?: string[];
  platforms?: string[];
  secret?: string;
}): WebhookSubscription {
  const hooks = ensureFile();
  const hook: WebhookSubscription = {
    id: crypto.randomUUID(),
    apiKey,
    url: data.url,
    min_spread_pct: data.min_spread_pct,
    categories: data.categories,
    platforms: data.platforms,
    secret: data.secret,
    createdAt: new Date().toISOString(),
  };
  hooks.push(hook);
  save(hooks);
  return hook;
}

export function deleteWebhook(apiKey: string, id: string): boolean {
  const hooks = ensureFile();
  const idx = hooks.findIndex(h => h.id === id && h.apiKey === apiKey);
  if (idx === -1) return false;
  hooks.splice(idx, 1);
  save(hooks);
  return true;
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function dispatchArbitrageAlerts(opportunities: ArbitrageOpportunity[]): void {
  if (opportunities.length === 0) return;

  const hooks = ensureFile();
  if (hooks.length === 0) return;

  for (const hook of hooks) {
    const filtered = opportunities.filter(opp => {
      if (opp.spreadPercent < hook.min_spread_pct) return false;
      if (hook.categories?.length && !hook.categories.some(c => opp.category.toLowerCase().includes(c.toLowerCase()))) return false;
      if (hook.platforms?.length && !hook.platforms.some(p =>
        opp.platformA.toLowerCase().includes(p.toLowerCase()) ||
        opp.platformB.toLowerCase().includes(p.toLowerCase())
      )) return false;
      return true;
    });

    if (filtered.length === 0) continue;

    const payload = JSON.stringify({
      event: 'arb.detected',
      timestamp: new Date().toISOString(),
      opportunities: filtered.map(opp => ({
        id: opp.id,
        market: opp.event,
        spread_pct: Math.round(opp.spreadPercent * 100) / 100,
        platform_a: { name: opp.platformA, price: opp.platformAPrice, deep_link: '' },
        platform_b: { name: opp.platformB, price: opp.platformBPrice, deep_link: '' },
        confidence: opp.confidence,
        category: opp.category,
      })),
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-ShadowBench-Event': 'arb.detected',
    };

    if (hook.secret) {
      headers['X-ShadowBench-Signature'] = signPayload(payload, hook.secret);
    }

    // Fire-and-forget with 5s timeout
    fetch(hook.url, {
      method: 'POST',
      headers,
      body: payload,
      signal: AbortSignal.timeout(5000),
    }).catch(err => {
      console.error(`Webhook dispatch failed for ${hook.id}:`, err.message);
    });
  }
}

'use client';

import { motion } from 'framer-motion';
import { GitCompare, AlertTriangle, ArrowRight } from 'lucide-react';
import type { ArbitrageOpportunity } from '@/types';

const mockArbs: ArbitrageOpportunity[] = [
  { id: '1', event: 'Will Bitcoin exceed $150K by Dec 2026?', platformA: 'Polymarket', platformAPrice: 0.42, platformB: 'Kalshi', platformBPrice: 0.38, spread: 0.04, spreadPercent: 9.5, category: 'Crypto' },
  { id: '2', event: 'US Recession in 2026?', platformA: 'Polymarket', platformAPrice: 0.31, platformB: 'Kalshi', platformBPrice: 0.27, spread: 0.04, spreadPercent: 12.9, category: 'Politics' },
  { id: '3', event: 'Fed Rate Cut by March 2026?', platformA: 'Kalshi', platformAPrice: 0.65, platformB: 'Polymarket', platformBPrice: 0.59, spread: 0.06, spreadPercent: 9.2, category: 'Politics' },
  { id: '4', event: 'Lakers Win NBA Championship?', platformA: 'Polymarket', platformAPrice: 0.12, platformB: 'Kalshi', platformBPrice: 0.08, spread: 0.04, spreadPercent: 33.3, category: 'Sports' },
  { id: '5', event: 'Ethereum Flippening in 2026?', platformA: 'Kalshi', platformAPrice: 0.05, platformB: 'Polymarket', platformBPrice: 0.03, spread: 0.02, spreadPercent: 40.0, category: 'Crypto' },
];

export default function ArbitragePage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <GitCompare className="w-6 h-6 text-gold" />
        <h1 className="text-2xl font-bold text-foreground">Arbitrage Scanner</h1>
      </div>

      <div className="bg-gold/10 border border-gold/20 rounded-xl p-4 mb-6 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-gold shrink-0" />
        <p className="text-sm text-gold">
          Connect Kalshi account to enable cross-platform arbitrage execution. Currently showing simulated opportunities.
        </p>
      </div>

      <div className="space-y-3">
        {mockArbs.map((arb, i) => (
          <motion.div
            key={arb.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 hover:border-gold/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{arb.event}</p>
              <span className="text-xs text-muted">{arb.category}</span>
            </div>
            <div className="text-center shrink-0">
              <div className="text-xs text-muted">{arb.platformA}</div>
              <div className="text-sm font-bold text-foreground">{(arb.platformAPrice * 100).toFixed(0)}¢</div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted shrink-0" />
            <div className="text-center shrink-0">
              <div className="text-xs text-muted">{arb.platformB}</div>
              <div className="text-sm font-bold text-foreground">{(arb.platformBPrice * 100).toFixed(0)}¢</div>
            </div>
            <div className="text-center shrink-0 min-w-[60px]">
              <div className="text-xs text-muted">Spread</div>
              <div className="text-sm font-bold text-gold">{arb.spreadPercent.toFixed(1)}%</div>
            </div>
            <button className="bg-gold/10 text-gold px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold/20 transition-colors shrink-0">
              Trade
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

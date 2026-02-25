'use client';

import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Target, Layers, BarChart3 } from 'lucide-react';
import type { Position } from '@/types';

const stats = [
  { label: 'Total Value', value: '$4,230.50', icon: DollarSign, color: 'text-foreground' },
  { label: "Today's P&L", value: '+$127.30', icon: TrendingUp, color: 'text-green' },
  { label: 'Win Rate', value: '64.2%', icon: Target, color: 'text-blue' },
  { label: 'Open Positions', value: '8', icon: Layers, color: 'text-gold' },
];

const positions: Position[] = [
  { id: '1', market: 'Will Bitcoin exceed $150K by Dec 2026?', side: 'YES', entry: 0.35, current: 0.42, size: 500, pnl: 100, pnlPercent: 20, platform: 'Polymarket' },
  { id: '2', market: 'US Recession in 2026?', side: 'NO', entry: 0.72, current: 0.69, size: 300, pnl: -12.86, pnlPercent: -4.17, platform: 'Polymarket' },
  { id: '3', market: 'Fed Rate Cut by March 2026?', side: 'YES', entry: 0.55, current: 0.62, size: 200, pnl: 25.45, pnlPercent: 12.73, platform: 'Kalshi' },
  { id: '4', market: 'Lakers Win NBA Championship?', side: 'YES', entry: 0.08, current: 0.12, size: 150, pnl: 75, pnlPercent: 50, platform: 'Polymarket' },
  { id: '5', market: 'Ethereum Flippening in 2026?', side: 'NO', entry: 0.95, current: 0.97, size: 400, pnl: 8.42, pnlPercent: 2.11, platform: 'Kalshi' },
];

export default function PortfolioPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Portfolio</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-surface border border-border rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4 text-muted" />
              <span className="text-xs text-muted">{stat.label}</span>
            </div>
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="bg-surface border border-border rounded-xl p-6 h-48 flex items-center justify-center mb-6">
        <div className="text-muted text-sm flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Portfolio Value Chart Coming Soon
        </div>
      </div>

      {/* Positions table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="text-left p-4 font-medium">Market</th>
                <th className="text-left p-4 font-medium">Side</th>
                <th className="text-right p-4 font-medium">Entry</th>
                <th className="text-right p-4 font-medium">Current</th>
                <th className="text-right p-4 font-medium">P&L</th>
                <th className="text-right p-4 font-medium">Platform</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => (
                <tr key={pos.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                  <td className="p-4 text-foreground max-w-xs truncate">{pos.market}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      pos.side === 'YES' ? 'bg-green/10 text-green' : 'bg-red/10 text-red'
                    }`}>
                      {pos.side}
                    </span>
                  </td>
                  <td className="p-4 text-right text-muted">{(pos.entry * 100).toFixed(0)}¢</td>
                  <td className="p-4 text-right text-foreground">{(pos.current * 100).toFixed(0)}¢</td>
                  <td className={`p-4 text-right font-medium ${pos.pnl >= 0 ? 'text-green' : 'text-red'}`}>
                    {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)} ({pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(1)}%)
                  </td>
                  <td className="p-4 text-right text-muted">{pos.platform}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

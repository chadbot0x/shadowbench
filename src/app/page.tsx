'use client';

import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, GitCompare, Radio, PieChart } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: BarChart3,
    title: 'Cross-Platform Trading',
    description: 'Trade on Polymarket and Kalshi from a single interface. Unified order books and real-time pricing.',
  },
  {
    icon: GitCompare,
    title: 'Arbitrage Scanner',
    description: 'Detect price discrepancies across platforms. One-click execution on risk-free spreads.',
  },
  {
    icon: Radio,
    title: 'Real-Time Data',
    description: 'WebSocket-powered live prices. Order book depth, volume, and price movement — all streaming.',
  },
  {
    icon: PieChart,
    title: 'Portfolio Tracking',
    description: 'Unified P&L across all platforms. Win rate, position breakdown, and historical performance.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#4a9eff 1px, transparent 1px), linear-gradient(90deg, #4a9eff 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="text-xl font-bold text-foreground tracking-tight">
          Shadow<span className="text-blue">Bench</span>
        </div>
        <Link
          href="/markets"
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          Launch Terminal →
        </Link>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-24 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Trade Prediction Markets{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #4a9eff, #ffd700)',
              }}
            >
              Like a Pro
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Cross-platform arbitrage detection, real-time order books, and one-click
            execution across Polymarket and Kalshi
          </p>
          <Link href="/markets">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 bg-blue text-background font-semibold px-8 py-4 rounded-lg text-lg hover:brightness-110 transition-all"
            >
              Launch Terminal
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </Link>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-32">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
              whileHover={{ y: -4, borderColor: '#4a9eff' }}
              className="bg-surface border border-border rounded-xl p-6 transition-colors"
            >
              <feature.icon className="w-8 h-8 text-blue mb-4" />
              <h3 className="text-foreground font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8 px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-muted">
          <span>ShadowBench</span>
          <div className="flex gap-6">
            <Link href="/markets" className="hover:text-foreground transition-colors">Markets</Link>
            <Link href="/arbitrage" className="hover:text-foreground transition-colors">Arbitrage</Link>
            <Link href="/portfolio" className="hover:text-foreground transition-colors">Portfolio</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

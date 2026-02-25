'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, GitCompare, Radio, Zap, Star, Search, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface TickerItem {
  question: string;
  price: number;
}

const features = [
  {
    icon: GitCompare,
    title: 'Cross-Platform Scanner',
    description: 'Hunt down inefficiencies across Polymarket × Kalshi. Professional-grade matching finds identical events trading at different prices.',
    gold: true,
  },
  {
    icon: Radio,
    title: 'Real-Time Alerts',
    description: 'Elite-level market monitoring. 30-second refresh keeps you ahead of the competition.',
    badge: 'Coming Soon',
  },
  {
    icon: Zap,
    title: 'One-Click Execution',
    description: 'Command center precision. Direct platform access with zero friction between opportunity and action.',
  },
  {
    icon: Star,
    title: 'Watchlist',
    description: 'Track your plays like a pro. Monitor spreads on your priority markets with elite focus.',
  },
];

const stats = [
  { label: 'Markets Tracked', value: '2.4K+' },
  { label: 'Volume Scanned', value: '$12M+' },
  { label: 'Uptime', value: '24/7' },
];

const steps = [
  { icon: Search, title: 'Discover', desc: 'We continuously scan Polymarket and Kalshi for price discrepancies across thousands of markets.' },
  { icon: TrendingUp, title: 'Track', desc: 'Monitor spreads in real-time with confidence scoring, volume data, and match quality indicators.' },
  { icon: Zap, title: 'Act', desc: 'One click to open the platform and trade. Deep links take you straight to the event.' },
];

function Ticker({ items }: { items: TickerItem[] }) {
  if (!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <div className="w-full overflow-hidden bg-surface border-b border-border py-2">
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: [0, -50 * items.length] }}
        transition={{ duration: items.length * 4, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((item, i) => (
          <span key={i} className="text-xs text-muted">
            <span className="text-foreground">{item.question.slice(0, 50)}{item.question.length > 50 ? '…' : ''}</span>
            {' '}
            <span className="text-green font-medium">{(item.price * 100).toFixed(0)}¢ YES</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  const [ticker, setTicker] = useState<TickerItem[]>([]);

  useEffect(() => {
    fetch('/api/markets?limit=10')
      .then(r => r.json())
      .then((markets: Array<{ question: string; outcomePrices: string }>) => {
        setTicker(markets.map(m => {
          try {
            const prices = JSON.parse(m.outcomePrices);
            return { question: m.question, price: parseFloat(prices[0]) || 0 };
          } catch { return { question: m.question, price: 0 }; }
        }).filter(t => t.price > 0));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#4a9eff 1px, transparent 1px), linear-gradient(90deg, #4a9eff 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10">
        <Ticker items={ticker} />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="text-xl font-bold text-foreground tracking-tight">
          MotionHQ
        </div>
        <Link href="/arbitrage" className="text-sm text-muted hover:text-foreground transition-colors">
          Launch Scanner →
        </Link>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #4a9eff, #ffd700)' }}>
              Motion Detected.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Cross-platform arbitrage scanner with elite sports stats and real-time market odds.
          </p>
          <Link href="/arbitrage">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 font-semibold px-8 py-4 rounded-lg text-lg transition-all text-background"
              style={{ background: 'linear-gradient(135deg, #ffd700, #ffaa00)' }}
            >
              Prove you know ball
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </Link>
        </motion.div>

        <div className="flex justify-center gap-12 mt-16 mb-20">
          {stats.map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Discover · Track · Act */}
        <div className="max-w-3xl mx-auto mb-24">
          <h2 className="text-center text-lg font-semibold text-foreground mb-8">Discover · Track · Act</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-3">
                  <step.icon className="w-6 h-6 text-gold" />
                </div>
                <div className="text-sm font-semibold text-foreground mb-1">{step.title}</div>
                <div className="text-xs text-muted leading-relaxed">{step.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Scanner preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-3xl mx-auto mb-24 bg-surface border border-border rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green" />
            </span>
            <span className="text-xs text-green font-medium">Live Scanner Preview</span>
          </div>
          {[
            { event: 'Will BTC exceed $150K by Dec 2026?', a: 42, b: 38, spread: 9.5 },
            { event: 'US Recession in 2026?', a: 31, b: 27, spread: 12.9 },
            { event: 'Fed Rate Cut by March 2026?', a: 65, b: 59, spread: 9.2 },
          ].map((mock) => (
            <div key={mock.event} className="flex items-center gap-4 py-2 border-b border-border last:border-0 text-sm">
              <span className="flex-1 text-foreground text-xs truncate">{mock.event}</span>
              <span className="text-green text-xs font-medium">{mock.a}¢</span>
              <span className="text-red text-xs font-medium">{mock.b}¢</span>
              <span className="text-gold font-bold text-xs">{mock.spread}%</span>
            </div>
          ))}
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
              whileHover={{ y: -4 }}
              className={`bg-surface border rounded-xl p-6 transition-colors ${
                feature.gold ? 'border-gold/40 hover:border-gold' : 'border-border hover:border-blue'
              }`}
            >
              <feature.icon className={`w-8 h-8 mb-4 ${feature.gold ? 'text-gold' : 'text-blue'}`} />
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-foreground font-semibold">{feature.title}</h3>
                {'badge' in feature && feature.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold/15 text-gold font-medium">{feature.badge}</span>
                )}
              </div>
              <p className="text-muted text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t border-border py-8 px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div>
            <span>MotionHQ</span>
            <span className="mx-2">·</span>
            <span className="text-xs">MotionHQ does not execute trades. You trade directly on each platform.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/markets" className="hover:text-foreground transition-colors">Markets</Link>
            <Link href="/arbitrage" className="hover:text-foreground transition-colors">Arbitrage</Link>
            <Link href="/watchlist" className="hover:text-foreground transition-colors">Watchlist</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

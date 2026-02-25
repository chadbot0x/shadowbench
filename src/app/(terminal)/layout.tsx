'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  GitCompare,
  PieChart,
  CandlestickChart,
  Settings,
  Menu,
  Search,
  Wallet,
} from 'lucide-react';

const navItems = [
  { href: '/markets', label: 'Markets', icon: BarChart3 },
  { href: '/arbitrage', label: 'Arbitrage', icon: GitCompare },
  { href: '/portfolio', label: 'Portfolio', icon: PieChart },
  { href: '/trade', label: 'Trade', icon: CandlestickChart },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r border-border bg-surface flex flex-col overflow-hidden shrink-0"
          >
            <div className="p-4 border-b border-border">
              <Link href="/" className="text-lg font-bold text-foreground tracking-tight">
                Shadow<span className="text-blue">Bench</span>
              </Link>
            </div>
            <nav className="flex-1 p-2 space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-blue/10 text-blue'
                        : 'text-muted hover:text-foreground hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-surface flex items-center px-4 gap-4 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search markets..."
                className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-blue transition-colors"
              />
            </div>
          </div>

          <button className="ml-auto flex items-center gap-2 bg-blue/10 text-blue px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue/20 transition-colors">
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

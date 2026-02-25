'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, GitCompare, PieChart, Menu, Search, Wallet } from 'lucide-react';

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [marketCount, setMarketCount] = useState<number | null>(null);
  const [arbCount, setArbCount] = useState<number | null>(null);
  const [scannerOnline, setScannerOnline] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    fetch('/api/markets?limit=1')
      .then(r => { if (r.ok) { setScannerOnline(true); setMarketCount(100); } })
      .catch(() => setScannerOnline(false));

    fetch('/api/arbitrage')
      .then(r => r.json())
      .then(d => { setArbCount(d.metadata?.matches_found ?? 0); setScannerOnline(true); })
      .catch(() => setScannerOnline(false));
  }, []);

  const handleNavClick = useCallback(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const navItems = [
    { href: '/markets', label: 'Markets', icon: BarChart3, badge: marketCount },
    { href: '/arbitrage', label: 'Arbitrage', icon: GitCompare, badge: arbCount, gold: true },
    { href: '/portfolio', label: 'Portfolio', icon: PieChart },
  ];

  const sidebarContent = (
    <motion.aside
      initial={{ width: isMobile ? 220 : 0, opacity: isMobile ? 1 : 0, x: isMobile ? -220 : 0 }}
      animate={{ width: 220, opacity: 1, x: 0 }}
      exit={{ width: isMobile ? 220 : 0, opacity: isMobile ? 1 : 0, x: isMobile ? -220 : 0 }}
      transition={{ duration: 0.2 }}
      className={`bg-surface flex flex-col overflow-hidden shrink-0 z-40 ${
        isMobile ? 'fixed inset-y-0 left-0 border-r border-border shadow-2xl' : 'border-r border-border'
      }`}
    >
      <div className="p-4 border-b border-border">
        <Link href="/" className="text-lg font-bold text-foreground tracking-tight" onClick={handleNavClick}>
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
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? item.gold ? 'bg-gold/10 text-gold' : 'bg-blue/10 text-blue'
                  : 'text-muted hover:text-foreground hover:bg-white/5'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge !== null && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  item.gold ? 'bg-gold/15 text-gold' : 'bg-blue/10 text-blue'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs">
          <span className="relative flex h-2 w-2">
            {scannerOnline ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red" />
            )}
          </span>
          <span className={scannerOnline ? 'text-green' : 'text-red'}>
            {scannerOnline ? 'Scanning' : 'Offline'}
          </span>
        </div>
      </div>
    </motion.aside>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        {sidebarOpen && sidebarContent}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted hover:text-foreground transition-colors shrink-0">
            <Menu className="w-5 h-5" />
          </button>
          {/* Search: icon-only on mobile, full on desktop */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search markets..."
                className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-blue transition-colors"
              />
            </div>
          </div>
          <button className="md:hidden text-muted hover:text-foreground transition-colors shrink-0">
            <Search className="w-5 h-5" />
          </button>
          {/* Wallet: hidden on mobile, full on desktop */}
          <button className="ml-auto hidden md:flex items-center gap-2 bg-blue/10 text-blue px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue/20 transition-colors shrink-0">
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </button>
          <button className="ml-auto md:hidden bg-blue/10 text-blue p-2 rounded-lg hover:bg-blue/20 transition-colors shrink-0">
            <Wallet className="w-4 h-4" />
          </button>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function WidgetContent() {
  const searchParams = useSearchParams();
  const theme = searchParams.get('theme') || 'dark';
  const show = searchParams.get('show') || 'both';

  const [arbCount, setArbCount] = useState<number | null>(null);
  const [bestSpread, setBestSpread] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/arbitrage');
        if (!res.ok) return;
        const data = await res.json();
        setArbCount(data.metadata?.matches_found ?? 0);
        const best = data.opportunities?.reduce(
          (max: number, o: { spreadPercent: number }) => Math.max(max, o.spreadPercent), 0
        ) ?? 0;
        setBestSpread(best);
      } catch { /* ignore */ }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-[#0a0a0f]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const muted = isDark ? 'text-gray-500' : 'text-gray-400';
  const border = isDark ? 'border-gray-800' : 'border-gray-200';
  const accent = 'text-emerald-400';

  return (
    <div className={`min-h-screen ${bg} flex items-center justify-center p-4`}>
      <a
        href="https://shadowbench.apiforchads.com"
        target="_blank"
        rel="noopener noreferrer"
        className={`block w-[320px] border ${border} rounded-2xl p-5 hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🔍</span>
          <span className={`text-sm font-bold ${text}`}>
            MotionHQ
          </span>
          <span className="ml-auto relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
        </div>

        {(show === 'count' || show === 'both') && (
          <div className="mb-3">
            <div className={`text-xs ${muted} mb-1`}>Active Arbs</div>
            <div className={`text-3xl font-bold ${accent}`}>
              {arbCount !== null ? arbCount : '—'}
            </div>
          </div>
        )}

        {(show === 'top-arb' || show === 'both') && (
          <div>
            <div className={`text-xs ${muted} mb-1`}>Best Spread</div>
            <div className={`text-3xl font-bold ${accent}`}>
              {bestSpread !== null ? `${bestSpread.toFixed(1)}%` : '—'}
            </div>
          </div>
        )}

        <div className={`text-[10px] ${muted} mt-4`}>
          Live prediction market arbitrage → shadowbench.apiforchads.com
        </div>
      </a>
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <WidgetContent />
    </Suspense>
  );
}

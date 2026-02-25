'use client';

import { useState } from 'react';
import { Code, Copy, Check, Eye } from 'lucide-react';

export default function EmbedPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [show, setShow] = useState<'count' | 'top-arb' | 'both'>('both');
  const [copied, setCopied] = useState(false);

  const embedCode = `<iframe src="https://shadowbench.apiforchads.com/widget?theme=${theme}&show=${show}" width="350" height="200" style="border:none;border-radius:12px;" />`;

  const copyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Code className="w-6 h-6 text-blue" />
        <h1 className="text-2xl font-bold text-foreground">Embed Widget</h1>
      </div>

      <p className="text-sm text-muted mb-8">Add a live ShadowBench widget to your site. Shows real-time arb count and best spread.</p>

      {/* Preview */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-muted" />
          <span className="text-sm font-medium text-foreground">Preview</span>
        </div>
        <div className="bg-background border border-border rounded-xl p-6 flex items-center justify-center">
          <iframe
            src={`/widget?theme=${theme}&show=${show}`}
            width={350}
            height={200}
            className="rounded-xl"
            style={{ border: 'none' }}
          />
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-xl p-4">
          <label className="text-xs text-muted mb-2 block">Theme</label>
          <div className="flex gap-2">
            {(['dark', 'light'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  theme === t ? 'bg-blue/15 text-blue' : 'text-muted hover:text-foreground hover:bg-white/5'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <label className="text-xs text-muted mb-2 block">Display</label>
          <div className="flex gap-2">
            {(['count', 'top-arb', 'both'] as const).map(s => (
              <button
                key={s}
                onClick={() => setShow(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  show === s ? 'bg-blue/15 text-blue' : 'text-muted hover:text-foreground hover:bg-white/5'
                }`}
              >
                {s === 'top-arb' ? 'Top Arb' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Code */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted">Embed Code</span>
          <button onClick={copyCode} className="flex items-center gap-2 text-xs text-blue hover:text-blue/80 transition-colors">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="bg-background rounded-lg p-4 text-xs text-foreground overflow-x-auto">
          <code>{embedCode}</code>
        </pre>
      </div>
    </div>
  );
}

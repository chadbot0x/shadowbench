import type { WatchlistItem } from '@/types';

const STORAGE_KEY = 'motionhq-watchlist';

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToWatchlist(item: WatchlistItem): void {
  const list = getWatchlist();
  if (!list.find(i => i.id === item.id)) {
    list.push(item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

export function removeFromWatchlist(id: string): void {
  const list = getWatchlist().filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function isInWatchlist(id: string): boolean {
  return getWatchlist().some(i => i.id === id);
}

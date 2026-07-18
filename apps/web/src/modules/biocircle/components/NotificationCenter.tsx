"use client";

import { useState } from 'react';
import type { BioCircleNotification } from '../types/biocircle.types';
import { SharedChapterCard } from './SharedChapterCard';
import { markNotificationRead } from '../services/biocircle.service';

interface NotificationCenterProps {
  notifications: BioCircleNotification[];
  onMarkAllRead?: () => void;
}

export function NotificationCenter({ notifications, onMarkAllRead }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const unread = items.filter((n) => !n.read).length;

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        type="button"
        aria-label={`Notificações${unread > 0 ? ` — ${unread} não lidas` : ''}`}
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <svg className="h-5 w-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Notificações</h3>
            {unread > 0 && onMarkAllRead && (
              <button
                type="button"
                onClick={() => { onMarkAllRead(); setItems((prev) => prev.map((n) => ({ ...n, read: true }))); }}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">Sem notificações</p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {items.map((n) => (
                  <div key={n.id} onClick={() => !n.read && handleMarkRead(n.id)} className="cursor-pointer">
                    <SharedChapterCard notification={n} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

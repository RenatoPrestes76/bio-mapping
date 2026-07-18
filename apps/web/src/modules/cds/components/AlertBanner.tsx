"use client";

import type { CdsAlert, CdsPriority } from '../types/cds.types';

const ALERT_ICON: Record<CdsPriority, string> = {
  LOW: 'ℹ️', MODERATE: '📋', HIGH: '⚠️', URGENT: '🚨', CRITICAL: '🆘',
};

const ALERT_STYLE: Record<CdsPriority, string> = {
  LOW: 'bg-zinc-50 border-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300',
  MODERATE: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300',
  HIGH: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300',
  URGENT: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300',
  CRITICAL: 'bg-red-900 border-red-700 text-white',
};

interface AlertBannerProps {
  alert: CdsAlert;
  onDismiss?: (id: string) => void;
}

export function AlertBanner({ alert, onDismiss }: AlertBannerProps) {
  return (
    <div
      role="alert"
      data-testid="alert-banner"
      data-priority={alert.priority}
      className={`flex items-start gap-3 rounded-xl border p-4 ${ALERT_STYLE[alert.priority]}`}
    >
      <span className="shrink-0 text-xl" aria-hidden="true">{ALERT_ICON[alert.priority]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{alert.reason}</p>
        <p className="mt-0.5 text-xs opacity-70">
          {new Date(alert.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          {' · '}{alert.origin}
        </p>
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dispensar alerta"
          onClick={() => onDismiss(alert.id)}
          className="shrink-0 opacity-60 hover:opacity-100"
        >
          ✕
        </button>
      )}
    </div>
  );
}

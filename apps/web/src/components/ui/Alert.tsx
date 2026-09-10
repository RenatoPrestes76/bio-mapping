import type { ReactNode } from 'react';

type AlertTone = 'error' | 'success' | 'info' | 'warning';

interface AlertProps {
  tone: AlertTone;
  children: ReactNode;
  className?: string;
}

const tones: Record<AlertTone, string> = {
  error: 'border-error/20 bg-error-bg text-error',
  success: 'border-success/20 bg-success-bg text-success',
  info: 'border-info/20 bg-info-bg text-info',
  warning: 'border-warning/20 bg-warning-bg text-warning',
};

const roleByTone: Record<AlertTone, 'alert' | 'status'> = {
  error: 'alert',
  warning: 'alert',
  success: 'status',
  info: 'status',
};

export function Alert({ tone, children, className = '' }: AlertProps) {
  return (
    <p role={roleByTone[tone]} className={`rounded-lg border px-3.5 py-2.5 text-sm ${tones[tone]} ${className}`.trim()}>
      {children}
    </p>
  );
}

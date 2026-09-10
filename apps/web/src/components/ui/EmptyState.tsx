import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

// Estados vazios que motivam em vez de soar como erro de sistema (Sprint 07,
// §22): sempre título + descrição em tom de convite, nunca só "Nenhum
// registro encontrado."
export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface-muted px-6 py-10 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="max-w-xs text-sm text-ink-faint">{description}</p>}
      {action}
    </div>
  );
}

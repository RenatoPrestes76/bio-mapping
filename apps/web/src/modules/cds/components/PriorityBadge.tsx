import type { CdsPriority } from '../types/cds.types';

const PRIORITY_LABEL: Record<CdsPriority, string> = {
  LOW: 'Baixo', MODERATE: 'Moderado', HIGH: 'Alto', URGENT: 'Urgente', CRITICAL: 'Crítico',
};

const PRIORITY_STYLE: Record<CdsPriority, string> = {
  LOW: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  MODERATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  CRITICAL: 'bg-red-900 text-white dark:bg-red-800',
};

interface PriorityBadgeProps {
  priority: CdsPriority;
  size?: 'sm' | 'md';
}

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps) {
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span
      data-testid="priority-badge"
      data-priority={priority}
      className={`inline-flex items-center rounded-full font-semibold ${sizeClass} ${PRIORITY_STYLE[priority]}`}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

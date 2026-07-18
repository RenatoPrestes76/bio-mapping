import type { BioCircleNotification } from '../types/biocircle.types';

const NOTIFICATION_LABEL: Record<string, string> = {
  CONNECTION_REQUEST: 'enviou um convite de conexão',
  CONNECTION_ACCEPTED: 'aceitou sua conexão',
  CHAPTER_SHARED: 'compartilhou um capítulo com você',
  ACHIEVEMENT_SHARED: 'compartilhou uma conquista',
  METRIC_SHARED: 'compartilhou uma métrica',
  GOAL_SHARED: 'compartilhou um objetivo',
};

function formatRelative(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 30) return `${days} dias atrás`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

interface SharedChapterCardProps {
  notification: BioCircleNotification;
}

export function SharedChapterCard({ notification }: SharedChapterCardProps) {
  const label = NOTIFICATION_LABEL[notification.type] ?? notification.type.toLowerCase().replace(/_/g, ' ');

  return (
    <div
      className={[
        'flex items-start gap-3 rounded-lg p-3 transition-colors',
        notification.read
          ? 'bg-transparent'
          : 'bg-zinc-50 dark:bg-zinc-800/50',
      ].join(' ')}
      data-testid="shared-chapter-card"
    >
      <div
        className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: notification.read ? 'transparent' : '#18181b' }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-800 dark:text-zinc-200">
          <span className="font-medium">{notification.referenceType ?? 'Alguém'}</span>{' '}
          {label}
        </p>
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
          {formatRelative(notification.createdAt)}
        </p>
      </div>
    </div>
  );
}

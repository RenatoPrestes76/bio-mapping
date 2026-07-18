"use client";

import type { BioTeamEvent, TeamEventType } from '../types/bioteams.types';

const EVENT_LABEL: Record<TeamEventType, string> = {
  TRAINING: 'Treino', COMPETITION: 'Competição', MEETING: 'Reunião',
  ASSESSMENT: 'Avaliação', CHALLENGE: 'Desafio', CONSULTATION: 'Consulta',
};

const EVENT_COLOR: Record<TeamEventType, string> = {
  TRAINING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  COMPETITION: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  MEETING: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
  ASSESSMENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  CHALLENGE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CONSULTATION: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const EVENT_ICON: Record<TeamEventType, string> = {
  TRAINING: '🏃', COMPETITION: '🏆', MEETING: '📋',
  ASSESSMENT: '📊', CHALLENGE: '⚡', CONSULTATION: '🩺',
};

interface TeamEventCardProps {
  event: BioTeamEvent;
  onGenerateChapter?: (eventId: string) => void;
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function TeamEventCard({ event, onGenerateChapter }: TeamEventCardProps) {
  const isUpcoming = new Date(event.startDate) > new Date();

  return (
    <div data-testid="team-event-card" className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{EVENT_ICON[event.eventType]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">{event.title}</h4>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EVENT_COLOR[event.eventType]}`}>
              {EVENT_LABEL[event.eventType]}
            </span>
            {isUpcoming && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Próximo
              </span>
            )}
          </div>
          {event.description && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{event.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span>📅 {formatEventDate(event.startDate)}</span>
            {event.location && <span>📍 {event.location}</span>}
          </div>
        </div>
      </div>
      {!isUpcoming && onGenerateChapter && (
        <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => onGenerateChapter(event.id)}
            className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Gerar capítulo do BioBook
          </button>
        </div>
      )}
    </div>
  );
}

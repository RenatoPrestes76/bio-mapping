"use client";

import type { TeamMural as TeamMuralData, BioTeamEvent } from '../types/bioteams.types';
import { TeamEventCard } from './TeamEventCard';

interface Chapter {
  id: string;
  title: string;
  chapterType: string;
  createdAt: string;
  userId: string;
}

const CHAPTER_TYPE_LABEL: Record<string, string> = {
  FIRST_ASSESSMENT: 'Primeira Avaliação', TRANSFORMATION: 'Transformação',
  MILESTONE: 'Marco', MEDICAL_FOLLOW_UP: 'Acompanhamento Médico',
  ACHIEVEMENT: 'Conquista', RECOVERY: 'Recuperação',
  TRAINING_CYCLE: 'Ciclo de Treino', COMPETITION: 'Competição',
  CHALLENGE: 'Desafio', NUTRITION_PHASE: 'Fase de Nutrição',
};

interface TeamMuralProps {
  mural: TeamMuralData;
}

function MuralChapterItem({ chapter }: { chapter: Chapter }) {
  return (
    <div className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="mt-0.5 text-xl">📖</span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          {CHAPTER_TYPE_LABEL[chapter.chapterType] ?? chapter.chapterType}
        </p>
        <p className="font-medium text-zinc-900 dark:text-zinc-50">{chapter.title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {new Date(chapter.createdAt).toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  );
}

export function TeamMural({ mural }: TeamMuralProps) {
  const chapters = mural.chapters as Chapter[];
  const isEmpty = chapters.length === 0 && mural.events.length === 0 && mural.recentJoins.length === 0;

  if (isEmpty) {
    return (
      <div className="py-10 text-center" data-testid="mural-empty">
        <p className="text-sm text-zinc-500">Nenhuma atividade recente no mural.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="team-mural">
      {mural.recentJoins.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Novos membros</h4>
          <div className="flex flex-wrap gap-2">
            {mural.recentJoins.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {m.userId.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{m.userId}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {mural.events.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Eventos recentes</h4>
          <div className="space-y-3">
            {mural.events.map((event) => (
              <TeamEventCard key={event.id} event={event as BioTeamEvent} />
            ))}
          </div>
        </div>
      )}

      {chapters.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Capítulos BioBook</h4>
          <div className="space-y-3">
            {chapters.map((chapter) => (
              <MuralChapterItem key={chapter.id} chapter={chapter} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import type { BioTeam, BioTeamMember, TeamMemberRole } from '../types/bioteams.types';

const CATEGORY_LABEL: Record<string, string> = {
  GYM: 'Academia', RUNNING: 'Corrida', CYCLING: 'Ciclismo', SWIMMING: 'Natação',
  TRIATHLON: 'Triathlon', BODYBUILDING: 'Musculação', CROSSFIT: 'CrossFit',
  MARTIAL_ARTS: 'Artes Marciais', SPORTS_CLUB: 'Clube Esportivo',
  CLINIC: 'Clínica', CORPORATE_WELLNESS: 'Bem-estar Corporativo', CUSTOM: 'Personalizado',
};

const VISIBILITY_LABEL: Record<string, string> = {
  PRIVATE: 'Privado', INVITE_ONLY: 'Por convite', PUBLIC: 'Público',
};

const ROLE_LABEL: Record<TeamMemberRole, string> = {
  OWNER: 'Fundador', ADMINISTRATOR: 'Administrador', COACH: 'Coach',
  TRAINER: 'Treinador', NUTRITIONIST: 'Nutricionista', PHYSICIAN: 'Médico',
  MEMBER: 'Membro', GUEST: 'Convidado',
};

interface TeamCardProps {
  team: BioTeam;
  member: BioTeamMember;
  onClick?: (teamId: string) => void;
}

export function TeamCard({ team, member, onClick }: TeamCardProps) {
  return (
    <button
      type="button"
      data-testid="team-card"
      onClick={() => onClick?.(team.id)}
      className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xl dark:bg-zinc-800">
          {team.logo ?? '🏋️'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{team.name}</h3>
            <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {ROLE_LABEL[member.role]}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {CATEGORY_LABEL[team.category]} · {VISIBILITY_LABEL[team.visibility]}
          </p>
          {team.description && (
            <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{team.description}</p>
          )}
        </div>
      </div>
    </button>
  );
}

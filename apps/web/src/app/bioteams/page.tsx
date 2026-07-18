"use client";

import { useState } from 'react';
import { useBioTeams } from '@/modules/bioteams/hooks/useBioTeams';
import { TeamCard } from '@/modules/bioteams/components/TeamCard';
import { TeamDashboard } from '@/modules/bioteams/components/TeamDashboard';
import { CreateTeamDialog } from '@/modules/bioteams/components/CreateTeamDialog';
import type { CreateTeamInput } from '@/modules/bioteams/types/bioteams.types';

const DEMO_USER_ID = 'demo-user';

export default function BioTeamsPage() {
  const { teams, loading, createTeam } = useBioTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  async function handleCreate(input: CreateTeamInput) {
    await createTeam(input);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        {selectedTeamId ? (
          <TeamDashboard
            teamId={selectedTeamId}
            currentUserId={DEMO_USER_ID}
            onBack={() => setSelectedTeamId(null)}
          />
        ) : (
          <>
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">BioTeams</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {teams.length === 0
                    ? 'Você ainda não faz parte de nenhuma equipe'
                    : `${teams.length} ${teams.length === 1 ? 'equipe' : 'equipes'}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
              >
                + Criar equipe
              </button>
            </div>

            {/* Teams list */}
            {teams.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-4xl">🏋️</p>
                <p className="mt-3 font-medium text-zinc-900 dark:text-zinc-50">Nenhuma equipe ainda</p>
                <p className="mt-1 text-sm text-zinc-500">Crie ou entre em uma equipe para começar.</p>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Criar minha primeira equipe
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {teams.map(({ team, member }) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    member={member}
                    onClick={(id) => setSelectedTeamId(id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <CreateTeamDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
    </main>
  );
}

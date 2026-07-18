"use client";

import { useState, useEffect } from 'react';
import type { TeamDashboardData, TeamMural as TeamMuralData, BioTeamMember, CreateEventInput, TeamMemberRole } from '../types/bioteams.types';
import * as svc from '../services/bioteams.service';
import { TeamMemberList } from './TeamMemberList';
import { TeamEventCard } from './TeamEventCard';
import { TeamMural } from './TeamMural';
import { InviteTeamDialog } from './InviteTeamDialog';

type Tab = 'mural' | 'members' | 'upcoming' | 'events';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'mural', label: 'Mural' },
  { id: 'members', label: 'Membros' },
  { id: 'upcoming', label: 'Agenda' },
  { id: 'events', label: 'Histórico' },
];

interface TeamDashboardProps {
  teamId: string;
  currentUserId: string;
  onBack: () => void;
}

export function TeamDashboard({ teamId, currentUserId, onBack }: TeamDashboardProps) {
  const [tab, setTab] = useState<Tab>('mural');
  const [dashboard, setDashboard] = useState<TeamDashboardData | null>(null);
  const [mural, setMural] = useState<TeamMuralData | null>(null);
  const [members, setMembers] = useState<BioTeamMember[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [dash, muralData, membersData] = await Promise.all([
          svc.getDashboard(teamId),
          svc.getMural(teamId),
          svc.getMembers(teamId),
        ]);
        setDashboard(dash);
        setMural(muralData);
        setMembers(membersData);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [teamId]);

  async function handleInvite(userId: string, role: TeamMemberRole) {
    await svc.inviteMember(teamId, userId, role);
    const updated = await svc.getMembers(teamId);
    setMembers(updated);
  }

  async function handleRemove(userId: string) {
    await svc.removeMember(teamId, userId);
    const updated = await svc.getMembers(teamId);
    setMembers(updated);
  }

  async function handleAcceptInvite(member: BioTeamMember) {
    await svc.acceptInvite(member.teamId);
    const updated = await svc.getMembers(teamId);
    setMembers(updated);
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Carregando equipe" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  if (!dashboard) return <p className="text-sm text-zinc-500">Equipe não encontrada.</p>;

  const myRole = dashboard.myRole as TeamMemberRole;
  const canInvite = ['OWNER', 'ADMINISTRATOR', 'COACH', 'TRAINER', 'NUTRITIONIST', 'PHYSICIAN'].includes(myRole);

  return (
    <div data-testid="team-dashboard">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <button type="button" onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          ← Voltar
        </button>
      </div>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{dashboard.team.name}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {dashboard.memberCount} {dashboard.memberCount === 1 ? 'membro' : 'membros'}
          </p>
        </div>
        {canInvite && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          >
            + Convidar
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Membros', value: dashboard.memberCount },
          { label: 'Próx. eventos', value: dashboard.upcomingEvents.length },
          { label: 'Eventos', value: dashboard.recentEvents.length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-zinc-200 bg-white p-3 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{value}</p>
            <p className="text-xs text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex border-b border-zinc-200 dark:border-zinc-800" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'mural' && mural && <TeamMural mural={mural} />}
        {tab === 'members' && (
          <TeamMemberList
            members={members}
            myRole={myRole}
            currentUserId={currentUserId}
            onRemove={handleRemove}
            onAcceptInvite={handleAcceptInvite}
          />
        )}
        {tab === 'upcoming' && (
          <div className="space-y-3">
            {dashboard.upcomingEvents.length === 0
              ? <p className="py-6 text-center text-sm text-zinc-500">Nenhum evento agendado.</p>
              : dashboard.upcomingEvents.map((e) => <TeamEventCard key={e.id} event={e} />)}
          </div>
        )}
        {tab === 'events' && (
          <div className="space-y-3">
            {dashboard.recentEvents.length === 0
              ? <p className="py-6 text-center text-sm text-zinc-500">Nenhum evento histórico.</p>
              : dashboard.recentEvents.map((e) => <TeamEventCard key={e.id} event={e} />)}
          </div>
        )}
      </div>

      <InviteTeamDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSubmit={handleInvite}
      />
    </div>
  );
}

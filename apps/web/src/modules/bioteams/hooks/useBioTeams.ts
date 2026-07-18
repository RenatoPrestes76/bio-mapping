"use client";

import { useState, useEffect, useCallback } from 'react';
import type { TeamWithMembership, BioTeamMember, TeamMemberRole, CreateTeamInput, CreateEventInput } from '../types/bioteams.types';
import * as svc from '../services/bioteams.service';

interface UseBioTeamsReturn {
  teams: TeamWithMembership[];
  loading: boolean;
  createTeam: (input: CreateTeamInput) => Promise<void>;
  inviteMember: (teamId: string, userId: string, role?: TeamMemberRole) => Promise<void>;
  acceptInvite: (teamId: string) => Promise<BioTeamMember | null>;
  removeMember: (teamId: string, userId: string) => Promise<void>;
  createEvent: (teamId: string, input: CreateEventInput) => Promise<void>;
  refresh: () => void;
}

export function useBioTeams(): UseBioTeamsReturn {
  const [teams, setTeams] = useState<TeamWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await svc.getMyTeams();
      setTeams(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const createTeam = useCallback(async (input: CreateTeamInput) => {
    await svc.createTeam(input);
    refresh();
  }, [refresh]);

  const inviteMember = useCallback(async (teamId: string, userId: string, role?: TeamMemberRole) => {
    await svc.inviteMember(teamId, userId, role);
  }, []);

  const acceptInvite = useCallback(async (teamId: string) => {
    const result = await svc.acceptInvite(teamId);
    refresh();
    return result;
  }, [refresh]);

  const removeMember = useCallback(async (teamId: string, userId: string) => {
    await svc.removeMember(teamId, userId);
    refresh();
  }, [refresh]);

  const createEvent = useCallback(async (teamId: string, input: CreateEventInput) => {
    await svc.createEvent(teamId, input);
    refresh();
  }, [refresh]);

  return { teams, loading, createTeam, inviteMember, acceptInvite, removeMember, createEvent, refresh };
}

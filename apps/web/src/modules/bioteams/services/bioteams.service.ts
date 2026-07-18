import type {
  BioTeam,
  BioTeamMember,
  BioTeamEvent,
  TeamWithMembership,
  TeamDashboardData,
  TeamMural,
  CreateTeamInput,
  CreateEventInput,
  TeamMemberRole,
} from '../types/bioteams.types';

const BASE = '/api/bioteams';

async function request<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    if (!res.ok) return null;
    if (res.status === 204) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export async function createTeam(input: CreateTeamInput): Promise<BioTeam | null> {
  return request<BioTeam>(BASE, { method: 'POST', body: JSON.stringify(input) });
}

export async function getMyTeams(): Promise<TeamWithMembership[]> {
  return (await request<TeamWithMembership[]>(BASE)) ?? [];
}

export async function getTeam(id: string): Promise<BioTeam | null> {
  return request<BioTeam>(`${BASE}/${id}`);
}

export async function updateTeam(id: string, data: Partial<CreateTeamInput>): Promise<BioTeam | null> {
  return request<BioTeam>(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteTeam(id: string): Promise<void> {
  await request<void>(`${BASE}/${id}`, { method: 'DELETE' });
}

export async function getMembers(teamId: string): Promise<BioTeamMember[]> {
  return (await request<BioTeamMember[]>(`${BASE}/${teamId}/members`)) ?? [];
}

export async function inviteMember(teamId: string, userId: string, role?: TeamMemberRole): Promise<BioTeamMember | null> {
  return request<BioTeamMember>(`${BASE}/${teamId}/invite`, { method: 'POST', body: JSON.stringify({ userId, role }) });
}

export async function acceptInvite(teamId: string): Promise<BioTeamMember | null> {
  return request<BioTeamMember>(`${BASE}/${teamId}/accept`, { method: 'POST' });
}

export async function removeMember(teamId: string, userId: string): Promise<void> {
  await request<void>(`${BASE}/${teamId}/members/${userId}`, { method: 'DELETE' });
}

export async function updateMemberRole(teamId: string, userId: string, role: TeamMemberRole): Promise<BioTeamMember | null> {
  return request<BioTeamMember>(`${BASE}/${teamId}/members/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
}

export async function joinByCode(code: string): Promise<BioTeamMember | null> {
  return request<BioTeamMember>(`${BASE}//join`, { method: 'POST', body: JSON.stringify({ code }) });
}

export async function getTeamEvents(teamId: string, upcoming?: boolean): Promise<BioTeamEvent[]> {
  const qs = upcoming ? '?upcoming=true' : '';
  return (await request<BioTeamEvent[]>(`${BASE}/${teamId}/events${qs}`)) ?? [];
}

export async function createEvent(teamId: string, input: CreateEventInput): Promise<BioTeamEvent | null> {
  return request<BioTeamEvent>(`${BASE}/${teamId}/events`, { method: 'POST', body: JSON.stringify(input) });
}

export async function getDashboard(teamId: string): Promise<TeamDashboardData | null> {
  return request<TeamDashboardData>(`${BASE}/${teamId}/dashboard`);
}

export async function getMural(teamId: string): Promise<TeamMural | null> {
  return request<TeamMural>(`${BASE}/${teamId}/mural`);
}

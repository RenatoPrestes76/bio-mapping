import type {
  BioConnection, ConnectionRelationshipType, UserPrivacySettings,
  BioCircleNotification, UserSearchResult, DashboardStats,
} from '../types/biocircle.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      ...options,
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export async function getDashboard(): Promise<DashboardStats | null> {
  return apiFetch<DashboardStats>('/biocircle/dashboard');
}

export async function searchUsers(q: string): Promise<UserSearchResult[]> {
  const data = await apiFetch<UserSearchResult[]>(`/biocircle/search?q=${encodeURIComponent(q)}`);
  return data ?? [];
}

export async function sendInvite(
  receiverId: string,
  relationshipType: ConnectionRelationshipType,
): Promise<BioConnection | null> {
  return apiFetch<BioConnection>('/biocircle/connect', {
    method: 'POST',
    body: JSON.stringify({ receiverId, relationshipType }),
  });
}

export async function getConnections(): Promise<BioConnection[]> {
  return (await apiFetch<BioConnection[]>('/biocircle/connections')) ?? [];
}

export async function getReceivedInvites(): Promise<BioConnection[]> {
  return (await apiFetch<BioConnection[]>('/biocircle/invites/received')) ?? [];
}

export async function getSentInvites(): Promise<BioConnection[]> {
  return (await apiFetch<BioConnection[]>('/biocircle/invites/sent')) ?? [];
}

export async function acceptInvite(id: string): Promise<BioConnection | null> {
  return apiFetch<BioConnection>(`/biocircle/connections/${id}/accept`, { method: 'PATCH' });
}

export async function rejectInvite(id: string): Promise<BioConnection | null> {
  return apiFetch<BioConnection>(`/biocircle/connections/${id}/reject`, { method: 'PATCH' });
}

export async function blockConnection(id: string): Promise<BioConnection | null> {
  return apiFetch<BioConnection>(`/biocircle/connections/${id}/block`, { method: 'PATCH' });
}

export async function removeConnection(id: string): Promise<BioConnection | null> {
  return apiFetch<BioConnection>(`/biocircle/connections/${id}`, { method: 'DELETE' });
}

export async function getPrivacySettings(): Promise<UserPrivacySettings | null> {
  return apiFetch<UserPrivacySettings>('/biocircle/settings/privacy');
}

export async function updatePrivacySettings(
  settings: Partial<Omit<UserPrivacySettings, 'id' | 'userId'>>,
): Promise<UserPrivacySettings | null> {
  return apiFetch<UserPrivacySettings>('/biocircle/settings/privacy', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function getNotifications(): Promise<BioCircleNotification[]> {
  return (await apiFetch<BioCircleNotification[]>('/biocircle/notifications')) ?? [];
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch(`/biocircle/notifications/${id}/read`, { method: 'PATCH' });
}

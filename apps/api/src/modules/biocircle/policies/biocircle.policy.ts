export type VisibilityLevel = 'EVERYONE' | 'CONNECTIONS' | 'NOBODY';

export interface PrivacySnapshot {
  discoverableBy: VisibilityLevel;
  invitesFrom: VisibilityLevel;
  bioBookVisible: VisibilityLevel;
  photosVisible: VisibilityLevel;
  metricsVisible: VisibilityLevel;
  achievementsVisible: VisibilityLevel;
}

export const DEFAULT_PRIVACY: PrivacySnapshot = {
  discoverableBy: 'EVERYONE',
  invitesFrom: 'EVERYONE',
  bioBookVisible: 'CONNECTIONS',
  photosVisible: 'CONNECTIONS',
  metricsVisible: 'CONNECTIONS',
  achievementsVisible: 'CONNECTIONS',
};

function evaluate(visibility: VisibilityLevel, isOwner: boolean, isConnected: boolean): boolean {
  if (isOwner) return true;
  if (visibility === 'EVERYONE') return true;
  if (visibility === 'CONNECTIONS') return isConnected;
  return false;
}

export function canDiscover(settings: PrivacySnapshot | null, isOwner: boolean, isConnected: boolean): boolean {
  return evaluate((settings ?? DEFAULT_PRIVACY).discoverableBy, isOwner, isConnected);
}

export function canSendInvite(settings: PrivacySnapshot | null, isOwner: boolean, isConnected: boolean): boolean {
  return evaluate((settings ?? DEFAULT_PRIVACY).invitesFrom, isOwner, isConnected);
}

export function canViewBioBook(settings: PrivacySnapshot | null, isOwner: boolean, isConnected: boolean): boolean {
  return evaluate((settings ?? DEFAULT_PRIVACY).bioBookVisible, isOwner, isConnected);
}

export function canViewPhotos(settings: PrivacySnapshot | null, isOwner: boolean, isConnected: boolean): boolean {
  return evaluate((settings ?? DEFAULT_PRIVACY).photosVisible, isOwner, isConnected);
}

export function canViewMetrics(settings: PrivacySnapshot | null, isOwner: boolean, isConnected: boolean): boolean {
  return evaluate((settings ?? DEFAULT_PRIVACY).metricsVisible, isOwner, isConnected);
}

export function canViewAchievements(settings: PrivacySnapshot | null, isOwner: boolean, isConnected: boolean): boolean {
  return evaluate((settings ?? DEFAULT_PRIVACY).achievementsVisible, isOwner, isConnected);
}

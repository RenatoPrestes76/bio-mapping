export type ConnectionRelationshipType =
  | 'FRIEND' | 'COACH' | 'TRAINER' | 'NUTRITIONIST'
  | 'PHYSICIAN' | 'FAMILY' | 'TEAMMATE';

export type ConnectionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED' | 'REMOVED';

export type PrivacyVisibility = 'EVERYONE' | 'CONNECTIONS' | 'NOBODY';

export type BioCircleNotificationType =
  | 'CONNECTION_REQUEST' | 'CONNECTION_ACCEPTED'
  | 'CHAPTER_SHARED' | 'ACHIEVEMENT_SHARED' | 'METRIC_SHARED' | 'GOAL_SHARED';

export interface BioConnection {
  id: string;
  requesterId: string;
  receiverId: string;
  relationshipType: ConnectionRelationshipType;
  status: ConnectionStatus;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPrivacySettings {
  id: string;
  userId: string;
  discoverableBy: PrivacyVisibility;
  invitesFrom: PrivacyVisibility;
  bioBookVisible: PrivacyVisibility;
  photosVisible: PrivacyVisibility;
  metricsVisible: PrivacyVisibility;
  achievementsVisible: PrivacyVisibility;
}

export interface BioCircleNotification {
  id: string;
  userId: string;
  type: BioCircleNotificationType;
  referenceId?: string;
  referenceType?: string;
  read: boolean;
  createdAt: string;
}

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
}

export interface DashboardStats {
  acceptedCount: number;
  pendingReceived: number;
  pendingSent: number;
  unreadNotifications: number;
}

export type TeamCategory =
  | 'GYM' | 'RUNNING' | 'CYCLING' | 'SWIMMING' | 'TRIATHLON' | 'BODYBUILDING'
  | 'CROSSFIT' | 'MARTIAL_ARTS' | 'SPORTS_CLUB' | 'CLINIC' | 'CORPORATE_WELLNESS' | 'CUSTOM';

export type TeamVisibility = 'PRIVATE' | 'INVITE_ONLY' | 'PUBLIC';

export type TeamMemberRole =
  | 'OWNER' | 'ADMINISTRATOR' | 'COACH' | 'TRAINER' | 'NUTRITIONIST' | 'PHYSICIAN' | 'MEMBER' | 'GUEST';

export type TeamMemberStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED';

export type TeamEventType = 'TRAINING' | 'COMPETITION' | 'MEETING' | 'ASSESSMENT' | 'CHALLENGE' | 'CONSULTATION';

export interface BioTeam {
  id: string;
  tenantId?: string;
  name: string;
  description?: string;
  category: TeamCategory;
  visibility: TeamVisibility;
  ownerId: string;
  coverImage?: string;
  logo?: string;
  inviteCode?: string;
  maxMembers?: number;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BioTeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  joinedAt: string;
}

export interface BioTeamEvent {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  eventType: TeamEventType;
  startDate: string;
  endDate?: string;
  location?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamWithMembership {
  team: BioTeam;
  member: BioTeamMember;
}

export interface TeamDashboardData {
  team: BioTeam;
  memberCount: number;
  recentMembers: BioTeamMember[];
  upcomingEvents: BioTeamEvent[];
  recentEvents: BioTeamEvent[];
  myRole: TeamMemberRole;
}

export interface TeamMural {
  chapters: unknown[];
  events: BioTeamEvent[];
  recentJoins: BioTeamMember[];
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  category: TeamCategory;
  visibility?: TeamVisibility;
  maxMembers?: number;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  eventType: TeamEventType;
  startDate: string;
  endDate?: string;
  location?: string;
}

export interface BioBookUser {
  name: string;
  username: string;
  avatarUrl?: string;
  mainGoal?: string;
  mainSport?: string;
  memberSince?: Date;
}

export interface EvolutionMetric {
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  change?: string;
}

export interface ActiveGoal {
  id: string;
  label: string;
  progress: number;
  nextMilestone?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description?: string;
  achievedAt: Date;
  category?: string;
}

export interface EvolutionPhoto {
  id: string;
  url: string;
  date: Date;
  label?: string;
}

export interface HealthSummary {
  openDecisions: number;
  criticalDecisions: number;
  activePathways: number;
  pendingRecommendations: number;
  recentTrends: TrendSummary[];
}

export interface TrendSummary {
  metric: string;
  trendType: string;
  direction: string;
  summary: string;
}

export interface CircleData {
  connections: number;
  teams: number;
  pendingInvites: number;
}

export interface TimelineEvent {
  id: string;
  eventType: string;
  severity: string;
  title: string;
  description?: string;
  occurredAt: Date;
  sourceTable: string;
}

export interface BioBookData {
  user: BioBookUser;
  metrics: EvolutionMetric[];
  goals: ActiveGoal[];
  achievements: Achievement[];
  photos: EvolutionPhoto[];
  health: HealthSummary;
  circle: CircleData;
  timeline: TimelineEvent[];
}

// ─── Story Engine ─────────────────────────────────────────────────────────────

export type ChapterType =
  | 'FIRST_ASSESSMENT'
  | 'TRANSFORMATION'
  | 'CHALLENGE'
  | 'COMPETITION'
  | 'TRAINING_CYCLE'
  | 'NUTRITION_PHASE'
  | 'MEDICAL_FOLLOW_UP'
  | 'ACHIEVEMENT'
  | 'RECOVERY'
  | 'MILESTONE';

export interface BioBookChapter {
  id: string;
  userId: string;
  title: string;
  subtitle?: string;
  chapterType: ChapterType;
  coverImage?: string;
  summary?: string;
  startDate: string;
  endDate?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ChapterShare {
  id: string;
  chapterId: string;
  sharedBy: string;
  sharedWith: string;
  message?: string;
  createdAt: string;
}

export interface StoryTimelineEntry {
  chapter: BioBookChapter;
  events: TimelineEvent[];
}

export interface StoryData {
  chapters: BioBookChapter[];
  timeline: StoryTimelineEntry[];
  hasStory: boolean;
}

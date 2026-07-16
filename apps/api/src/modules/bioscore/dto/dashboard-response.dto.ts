import type { BioScoreResponseDto } from './bioscore-response.dto.js';
import type { RecoveryResponseDto } from './bioscore-response.dto.js';

export class DashboardResponseDto {
  patientId: string;
  generatedAt: Date;
  bioScore?: BioScoreResponseDto;
  recovery?: RecoveryResponseDto;
  recentAlerts: AlertSummaryDto[];
  trends: TrendSummaryDto[];
  weeklyActivity: WeeklyActivityDto;
}

export class AlertSummaryDto {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  triggeredAt: Date;
}

export class TrendSummaryDto {
  metric: string;
  period: string;
  trend: string;
  changePct: number;
  isPersonalRecord: boolean;
  isPlateauDetected: boolean;
}

export class WeeklyActivityDto {
  activeDays: number;
  totalSessions: number;
  totalDistanceM?: number;
  consistencyPct: number;
}

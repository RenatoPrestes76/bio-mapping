export interface HealthGoal {
  id: string;
  category: string;
  description: string;
  targetValue?: number;
  targetUnit?: string;
  timeframeWeeks: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface MonitoringPlan {
  biomarkersToMonitor: string[];
  checkupFrequencyWeeks: number;
  selfMonitoringItems: string[];
}

export interface FollowUpSchedule {
  nextCheckupWeeks: number;
  specialistReferrals: string[];
  examsRequired: string[];
}

export interface PersonalizedPlanData {
  id?: string;
  patientId: string;
  goals: HealthGoal[];
  recommendations: string[];
  monitoringPlan: MonitoringPlan;
  followUp: FollowUpSchedule;
  riskFactors: string[];
  expectedOutcomes: string[];
  confidence: number;
  version?: string;
  createdAt?: Date;
}

export class PersonalizedPlan {
  readonly id: string;
  readonly patientId: string;
  readonly goals: HealthGoal[];
  readonly recommendations: string[];
  readonly monitoringPlan: MonitoringPlan;
  readonly followUp: FollowUpSchedule;
  readonly riskFactors: string[];
  readonly expectedOutcomes: string[];
  readonly confidence: number;
  readonly version: string;
  readonly createdAt: Date;

  constructor(data: PersonalizedPlanData) {
    this.id = data.id ?? `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.patientId = data.patientId;
    this.goals = data.goals;
    this.recommendations = data.recommendations;
    this.monitoringPlan = data.monitoringPlan;
    this.followUp = data.followUp;
    this.riskFactors = data.riskFactors;
    this.expectedOutcomes = data.expectedOutcomes;
    this.confidence = Math.min(1, Math.max(0, data.confidence));
    this.version = data.version ?? '1.0.0';
    this.createdAt = data.createdAt ?? new Date();
  }

  hasCriticalGoals(): boolean {
    return this.goals.some((g) => g.priority === 'CRITICAL');
  }

  getCriticalGoals(): HealthGoal[] {
    return this.goals.filter((g) => g.priority === 'CRITICAL');
  }

  getHighPriorityGoals(): HealthGoal[] {
    return this.goals.filter((g) => g.priority === 'CRITICAL' || g.priority === 'HIGH');
  }
}

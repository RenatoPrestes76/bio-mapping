import type { JourneyPhase, PhaseType } from './journey-phase.entity.js';

export type JourneyDirection = 'ADVANCING' | 'STABLE' | 'NEEDS_ATTENTION';

export class JourneyPath {
  readonly id: string;
  readonly patientId: string;
  readonly phases: JourneyPhase[];
  readonly currentPhaseIndex: number;
  readonly progressPercentage: number;
  readonly overallDirection: JourneyDirection;
  readonly narrative: string;

  constructor(params: {
    id?: string;
    patientId: string;
    phases: JourneyPhase[];
    currentPhaseIndex: number;
    progressPercentage?: number;
    overallDirection?: JourneyDirection;
    narrative?: string;
  }) {
    this.id = params.id ?? `path-${params.patientId}-${Date.now()}`;
    this.patientId = params.patientId;
    this.phases = params.phases;
    this.currentPhaseIndex = Math.max(0, Math.min(params.currentPhaseIndex, params.phases.length - 1));
    this.progressPercentage = Math.max(0, Math.min(100, params.progressPercentage ?? 0));
    this.overallDirection = params.overallDirection ?? 'STABLE';
    this.narrative = params.narrative ?? '';
  }

  getCurrentPhase(): JourneyPhase | undefined {
    return this.phases[this.currentPhaseIndex];
  }

  getNextPhase(): JourneyPhase | undefined {
    return this.phases[this.currentPhaseIndex + 1];
  }

  getCompletedPhases(): JourneyPhase[] {
    return this.phases.filter((p) => p.isCompleted());
  }

  getUpcomingPhases(): JourneyPhase[] {
    return this.phases.filter((p) => p.isAhead());
  }

  getPhaseByType(type: PhaseType): JourneyPhase | undefined {
    return this.phases.find((p) => p.type === type);
  }

  isAdvancing(): boolean {
    return this.overallDirection === 'ADVANCING';
  }

  needsAttention(): boolean {
    return this.overallDirection === 'NEEDS_ATTENTION';
  }
}

import { ClinicalHypothesis } from './clinical-hypothesis.entity.js';
import { ReasoningStep } from './reasoning-step.entity.js';

export enum AlertSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface ClinicalAlert {
  id: string;
  severity: AlertSeverity;
  condition: string;
  message: string;
  action: string;
}

export interface InferenceResultData {
  id: string;
  patientId: string;
  hypotheses: ClinicalHypothesis[];
  recommendations: string[];
  alerts: ClinicalAlert[];
  confidence: number;
  version?: string;
  steps?: ReasoningStep[];
  createdAt?: Date;
}

export class InferenceResult {
  readonly id: string;
  readonly patientId: string;
  readonly hypotheses: ClinicalHypothesis[];
  readonly recommendations: string[];
  readonly alerts: ClinicalAlert[];
  readonly confidence: number;
  readonly version: string;
  readonly steps: ReasoningStep[];
  readonly createdAt: Date;

  constructor(data: InferenceResultData) {
    this.id = data.id;
    this.patientId = data.patientId;
    this.hypotheses = data.hypotheses;
    this.recommendations = data.recommendations;
    this.alerts = data.alerts;
    this.confidence = Math.min(1, Math.max(0, data.confidence));
    this.version = data.version ?? '1.0.0';
    this.steps = data.steps ?? [];
    this.createdAt = data.createdAt ?? new Date();
  }

  getTopHypotheses(n: number): ClinicalHypothesis[] {
    return [...this.hypotheses].sort((a, b) => b.overallScore() - a.overallScore()).slice(0, n);
  }

  hasCriticalAlerts(): boolean {
    return this.alerts.some((a) => a.severity === AlertSeverity.CRITICAL);
  }

  hasHighPriorityAlerts(): boolean {
    return this.alerts.some(
      (a) => a.severity === AlertSeverity.CRITICAL || a.severity === AlertSeverity.HIGH,
    );
  }

  getExplanation(): string {
    const top = this.getTopHypotheses(3)
      .map((h) => `${h.condition} (P=${(h.probability * 100).toFixed(0)}%, C=${(h.confidence * 100).toFixed(0)}%)`)
      .join('; ');
    return (
      `Resultado de inferência: ${this.hypotheses.length} hipótese(s) gerada(s). ` +
      `Principais: ${top || 'nenhuma'}. Versão: ${this.version}.`
    );
  }
}

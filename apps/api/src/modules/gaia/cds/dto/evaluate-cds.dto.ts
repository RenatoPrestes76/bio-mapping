export class EvaluateCdsDto {
  patientId!: string;
  variables!: Record<string, number | string | boolean>;
  context?: string;
  predictionData?: Record<string, unknown>;
  riskData?: Record<string, unknown>;
  examCount?: number;
  biomarkerCount?: number;
  hasLongitudinalHistory?: boolean;
}

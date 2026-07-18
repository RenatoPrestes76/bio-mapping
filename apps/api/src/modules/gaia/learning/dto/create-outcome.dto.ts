export class CreateOutcomeDto {
  decisionId!: string;
  patientId!: string;
  followUpDate!: string;
  outcome!: 'IMPROVED' | 'STABLE' | 'WORSENED' | 'HOSPITALIZED' | 'RESOLVED' | 'UNKNOWN';
  validatedBy!: string;
  comments?: string;
  predictedValue?: string;
  actualValue?: string;
  recommendation?: string;
  adherence?: 'FOLLOWED' | 'PARTIALLY_FOLLOWED' | 'IGNORED';
  modelVersion?: string;
  variables?: Record<string, unknown>;
  tenantId?: string;
}

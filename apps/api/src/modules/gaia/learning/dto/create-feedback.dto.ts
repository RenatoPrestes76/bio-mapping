export class CreateFeedbackDto {
  decisionId!: string;
  role!: 'PHYSICIAN' | 'NUTRITIONIST' | 'HEALTH_PROFESSIONAL' | 'PATIENT';
  classification!: 'CORRECT' | 'PARTIALLY_CORRECT' | 'INCORRECT' | 'INCONCLUSIVE';
  comment?: string;
  suggestedAction?: string;
  modelVersion?: string;
  tenantId?: string;
}

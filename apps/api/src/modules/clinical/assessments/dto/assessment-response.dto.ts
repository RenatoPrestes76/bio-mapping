export interface AnswerResponseDto {
  id: string;
  fieldId: string;
  value: string | null;
  score: number | null;
  comment: string | null;
  updatedAt: Date;
}

export interface AssessmentResponseDto {
  id: string;
  patientId: string;
  professionalId: string | null;
  organizationId: string | null;
  templateId: string;
  templateName: string;
  templateCategory: string;
  status: string;
  performedAt: Date | null;
  validatedAt: Date | null;
  lockedAt: Date | null;
  lockedBy: string | null;
  notes: string | null;
  totalScore: number | null;
  maxScore: number | null;
  scorePercent: number | null;
  classification: string | null;
  riskLevel: string | null;
  answers: AnswerResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export function toAssessmentResponse(a: any): AssessmentResponseDto {
  return {
    id: a.id,
    patientId: a.patientId,
    professionalId: a.professionalId,
    organizationId: a.organizationId,
    templateId: a.templateId,
    templateName: a.template?.name ?? '',
    templateCategory: a.template?.category ?? '',
    status: a.status,
    performedAt: a.performedAt,
    validatedAt: a.validatedAt,
    lockedAt: a.lockedAt,
    lockedBy: a.lockedBy,
    notes: a.notes,
    totalScore: a.totalScore,
    maxScore: a.maxScore,
    scorePercent: a.scorePercent,
    classification: a.classification,
    riskLevel: a.riskLevel,
    answers: (a.answers ?? []).map((ans: any) => ({
      id: ans.id,
      fieldId: ans.fieldId,
      value: ans.value,
      score: ans.score,
      comment: ans.comment,
      updatedAt: ans.updatedAt,
    })),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

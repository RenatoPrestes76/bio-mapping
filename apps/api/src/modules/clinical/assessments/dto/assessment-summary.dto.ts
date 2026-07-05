export interface ScorePoint {
  date: Date;
  score: number;
  percentage: number;
  templateName: string;
  category: string;
}

export interface AssessmentSummaryDto {
  totalAssessments: number;
  draftCount: number;
  inProgressCount: number;
  completedCount: number;
  validatedCount: number;
  lockedCount: number;
  lastAssessment: {
    id: string;
    templateName: string;
    category: string;
    status: string;
    performedAt: Date | null;
  } | null;
  categoriesAssessed: string[];
  professionalsInvolved: string[];
  scoreEvolution: ScorePoint[];
}

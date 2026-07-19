import { EvidenceSource } from '../entities/evidence.entity.js';
import { GradeQuality, RecommendationStrength } from '../entities/evidence-rating.entity.js';

export enum OxfordLevel {
  LEVEL_1A = '1a',
  LEVEL_1B = '1b',
  LEVEL_2A = '2a',
  LEVEL_2B = '2b',
  LEVEL_3A = '3a',
  LEVEL_3B = '3b',
  LEVEL_4 = '4',
  LEVEL_5 = '5',
}

export enum USPSTFGrade {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  I = 'I',
}

export enum AHRQLevel {
  I = 'I',
  II = 'II',
  III = 'III',
  IV = 'IV',
  V = 'V',
  VI = 'VI',
  VII = 'VII',
}

export interface GradingResult {
  oxfordLevel: OxfordLevel;
  uspstfGrade: USPSTFGrade;
  ahrqLevel: AHRQLevel;
  gradeQuality: GradeQuality;
  numericScore: number;
}

const SOURCE_TO_OXFORD: Record<EvidenceSource, OxfordLevel> = {
  [EvidenceSource.META_ANALYSIS]: OxfordLevel.LEVEL_1A,
  [EvidenceSource.SYSTEMATIC_REVIEW]: OxfordLevel.LEVEL_1A,
  [EvidenceSource.COCHRANE]: OxfordLevel.LEVEL_1A,
  [EvidenceSource.PUBMED]: OxfordLevel.LEVEL_1B,
  [EvidenceSource.CLINICAL_TRIALS]: OxfordLevel.LEVEL_2B,
  [EvidenceSource.NIH]: OxfordLevel.LEVEL_2B,
  [EvidenceSource.WHO]: OxfordLevel.LEVEL_2B,
  [EvidenceSource.JOURNAL]: OxfordLevel.LEVEL_2B,
  [EvidenceSource.GUIDELINE]: OxfordLevel.LEVEL_4,
};

const SOURCE_TO_AHRQ: Record<EvidenceSource, AHRQLevel> = {
  [EvidenceSource.META_ANALYSIS]: AHRQLevel.I,
  [EvidenceSource.SYSTEMATIC_REVIEW]: AHRQLevel.I,
  [EvidenceSource.COCHRANE]: AHRQLevel.I,
  [EvidenceSource.PUBMED]: AHRQLevel.II,
  [EvidenceSource.CLINICAL_TRIALS]: AHRQLevel.II,
  [EvidenceSource.NIH]: AHRQLevel.IV,
  [EvidenceSource.WHO]: AHRQLevel.IV,
  [EvidenceSource.JOURNAL]: AHRQLevel.II,
  [EvidenceSource.GUIDELINE]: AHRQLevel.VII,
};

export function getOxfordLevel(source: EvidenceSource): OxfordLevel {
  return SOURCE_TO_OXFORD[source] ?? OxfordLevel.LEVEL_5;
}

export function getAHRQLevel(source: EvidenceSource): AHRQLevel {
  return SOURCE_TO_AHRQ[source] ?? AHRQLevel.VII;
}

export function getUSPSTFGrade(grade: GradeQuality, strength: RecommendationStrength): USPSTFGrade {
  if (grade === GradeQuality.HIGH && strength === RecommendationStrength.STRONG) return USPSTFGrade.A;
  if (grade === GradeQuality.MODERATE && strength === RecommendationStrength.STRONG) return USPSTFGrade.B;
  if (grade === GradeQuality.VERY_LOW) return USPSTFGrade.I;
  if (strength === RecommendationStrength.WEAK) return USPSTFGrade.D;
  return USPSTFGrade.C;
}

export function buildGradingResult(
  source: EvidenceSource,
  grade: GradeQuality,
  strength: RecommendationStrength,
  numericScore: number,
): GradingResult {
  return {
    oxfordLevel: getOxfordLevel(source),
    uspstfGrade: getUSPSTFGrade(grade, strength),
    ahrqLevel: getAHRQLevel(source),
    gradeQuality: grade,
    numericScore,
  };
}

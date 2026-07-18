import { ClinicalInsightCategory } from '@bio/database';
import type { ScoringInput, ScoringResult, RiskLevel } from '../scoring/engines/scoring-engine.interface';
import { ClinicalContext, Confidence, DecisionTrace, Explainability } from '../../gaia/contracts';

export type { RiskLevel };

/**
 * Chaves das capabilities do ClinicalContext (exclui patientId/metadata/patient,
 * que não são CapabilitySection). Usado por ClinicalRiskModel.requiredCapabilities
 * para o cálculo estrutural de Confidence — nenhum modelo precisa saber como
 * ler o ClinicalContext, só declarar do que precisa.
 */
export type ClinicalContextCapabilityKey =
  | 'vitals'
  | 'laboratory'
  | 'lifestyle'
  | 'nutrition'
  | 'medication'
  | 'conditions'
  | 'assessments'
  | 'wearables'
  | 'familyHistory'
  | 'genomics'
  | 'imaging'
  | 'fhirResources';

/**
 * Resultado de uma avaliação de risco clínico (Sprint 14.3, T3). `confidence`
 * é sempre a mesma referência de `explainability.confidence` — não há dois
 * cálculos de confiança para a mesma decisão.
 */
export interface ClinicalRiskAssessment {
  riskId: string;
  riskCategory: ClinicalInsightCategory;
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: Confidence;
  explainability: Explainability;
  decisionTrace: DecisionTrace;
  recommendations: string[];
  modelVersion: string;
  metadata: Record<string, unknown>;
}

/**
 * Contrato que cada doença/condição implementa (Sprint 14.3, Diretriz 2).
 * O ClinicalRiskEngine só conhece esta interface — nunca IMC, glicemia,
 * passos ou qualquer outro dado específico de domínio (Diretriz 1).
 */
export interface ClinicalRiskModel {
  readonly category: ClinicalInsightCategory;
  readonly name: string;
  readonly version: string;
  readonly scoringEngineName: string;
  readonly requiredCapabilities: ClinicalContextCapabilityKey[];

  buildScoringInput(context: ClinicalContext): ScoringInput;

  buildRecommendations(result: ScoringResult, context: ClinicalContext): string[];
}

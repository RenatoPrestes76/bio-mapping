import { ClinicalDecision } from '../entities/clinical-decision.entity.js';
import type {
  ClinicalRecommendationItem,
  EvidenceContribution,
  DecisionExplanation,
  ConflictRecord,
} from '../entities/clinical-decision.entity.js';

function makeRec(overrides: Partial<ClinicalRecommendationItem> = {}): ClinicalRecommendationItem {
  return {
    id: `rec-${Math.random().toString(36).slice(2, 6)}`,
    category: 'PHARMACOGENOMICS',
    action: 'Avoid clopidogrel',
    rationale: 'CYP2C19 Poor Metabolizer',
    urgency: 'IMMEDIATE',
    confidenceContribution: 80,
    sourceModule: 'pharmacogenomics',
    evidenceLevel: 'A',
    contraindications: ['clopidogrel'],
    alternatives: ['prasugrel'],
    ...overrides,
  };
}

function makeEvidence(overrides: Partial<EvidenceContribution> = {}): EvidenceContribution {
  return {
    sourceModule: 'pharmacogenomics',
    evidenceType: 'PHARMACOGENOMIC',
    summary: 'PGx analysis',
    confidenceWeight: 0.9,
    dataCompleteness: 1.0,
    ...overrides,
  };
}

function makeExplanation(overrides: Partial<DecisionExplanation> = {}): DecisionExplanation {
  return {
    summary: 'Test decision',
    contributingModules: ['pharmacogenomics'],
    keyFindings: ['IMMEDIATE: Avoid clopidogrel'],
    conflictsResolved: 0,
    reasoningChain: ['Step 1', 'Step 2'],
    limitations: ['None'],
    dataCompleteness: 80,
    modulesQueried: ['pharmacogenomics', 'genomic'],
    modulesWithData: ['pharmacogenomics'],
    ...overrides,
  };
}

function makeDecision(overrides: Partial<ConstructorParameters<typeof ClinicalDecision>[0]> = {}): ClinicalDecision {
  return new ClinicalDecision({
    patientId: 'p-001',
    decisionType: 'COMPREHENSIVE',
    priority: 'HIGH',
    confidence: 78,
    clinicalSummary: 'Test clinical summary',
    recommendations: [makeRec()],
    evidence: [makeEvidence()],
    explanation: makeExplanation(),
    contributingModules: ['pharmacogenomics'],
    ...overrides,
  });
}

describe('ClinicalDecision', () => {
  it('generates a unique id', () => {
    const a = makeDecision();
    const b = makeDecision();
    expect(a.id).not.toBe(b.id);
    expect(a.id).toMatch(/^cds-/);
  });

  it('clamps confidence to [0, 100]', () => {
    expect(makeDecision({ confidence: 150 }).confidence).toBe(100);
    expect(makeDecision({ confidence: -10 }).confidence).toBe(0);
    expect(makeDecision({ confidence: 75 }).confidence).toBe(75);
  });

  it('defaults status to DRAFT', () => {
    expect(makeDecision().status).toBe('DRAFT');
  });

  it('isHighConfidence returns true for confidence >= 75', () => {
    expect(makeDecision({ confidence: 75 }).isHighConfidence()).toBe(true);
    expect(makeDecision({ confidence: 74 }).isHighConfidence()).toBe(false);
    expect(makeDecision({ confidence: 100 }).isHighConfidence()).toBe(true);
  });

  it('isCritical returns true only for CRITICAL priority', () => {
    expect(makeDecision({ priority: 'CRITICAL' }).isCritical()).toBe(true);
    expect(makeDecision({ priority: 'HIGH' }).isCritical()).toBe(false);
  });

  it('hasConflicts returns true when conflictsResolved is non-empty', () => {
    const conflict: ConflictRecord = {
      id: 'c-1',
      conflictType: 'DRUG_CONTRAINDICATION',
      description: 'test',
      resolution: 'resolved',
      resolutionStrategy: 'CONTRAINDICATION_WINS',
      affectedRecommendations: ['rec-1'],
      resolvedAt: new Date(),
    };
    expect(makeDecision({ conflictsResolved: [conflict] }).hasConflicts()).toBe(true);
    expect(makeDecision({ conflictsResolved: [] }).hasConflicts()).toBe(false);
  });

  it('getActionableRecommendations filters IMMEDIATE and SHORT_TERM', () => {
    const recs: ClinicalRecommendationItem[] = [
      makeRec({ urgency: 'IMMEDIATE' }),
      makeRec({ urgency: 'SHORT_TERM' }),
      makeRec({ urgency: 'ROUTINE' }),
    ];
    const decision = makeDecision({ recommendations: recs });
    expect(decision.getActionableRecommendations()).toHaveLength(2);
  });

  it('getRecommendationsByCategory filters by category', () => {
    const recs: ClinicalRecommendationItem[] = [
      makeRec({ category: 'PHARMACOGENOMICS' }),
      makeRec({ category: 'GENOMICS' }),
      makeRec({ category: 'PHARMACOGENOMICS' }),
    ];
    const decision = makeDecision({ recommendations: recs });
    expect(decision.getRecommendationsByCategory('PHARMACOGENOMICS')).toHaveLength(2);
    expect(decision.getRecommendationsByCategory('GENOMICS')).toHaveLength(1);
    expect(decision.getRecommendationsByCategory('MONITORING')).toHaveLength(0);
  });

  it('requiresImmediateAction returns true when any recommendation is IMMEDIATE', () => {
    expect(makeDecision({ recommendations: [makeRec({ urgency: 'IMMEDIATE' })] }).requiresImmediateAction()).toBe(true);
    expect(makeDecision({ recommendations: [makeRec({ urgency: 'ROUTINE' })] }).requiresImmediateAction()).toBe(false);
  });

  it('getPrimaryRecommendation returns highest confidence item', () => {
    const recs: ClinicalRecommendationItem[] = [
      makeRec({ confidenceContribution: 50 }),
      makeRec({ confidenceContribution: 90 }),
      makeRec({ confidenceContribution: 70 }),
    ];
    const primary = makeDecision({ recommendations: recs }).getPrimaryRecommendation();
    expect(primary?.confidenceContribution).toBe(90);
  });

  it('toSummary returns compact summary object', () => {
    const d = makeDecision();
    const s = d.toSummary();
    expect(s).toHaveProperty('id');
    expect(s).toHaveProperty('patientId');
    expect(s).toHaveProperty('confidence');
    expect(s.recommendationCount).toBe(1);
  });
});

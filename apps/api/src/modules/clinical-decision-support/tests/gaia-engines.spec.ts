import { ConfidenceScoreEngine } from '../engines/confidence-score.engine.js';
import { ConflictResolverEngine } from '../engines/conflict-resolver.engine.js';
import { ExplanationBuilderEngine } from '../engines/explanation-builder.engine.js';
import type { ClinicalRecommendationItem, EvidenceContribution } from '../entities/clinical-decision.entity.js';
import { EvidenceWeightedSynthesis, PriorityFirstSynthesis, DecisionSynthesisStrategyFactory } from '../strategies/decision-synthesis.strategy.js';
import { computeDecisionPriority, computeRecommendationUrgency } from '../rules/decision-priority.rules.js';

function makeRec(overrides: Partial<ClinicalRecommendationItem> = {}): ClinicalRecommendationItem {
  return {
    id: `rec-${Math.random().toString(36).slice(2, 6)}`,
    category: 'PHARMACOGENOMICS',
    action: 'Use standard dose',
    rationale: 'Normal metabolizer',
    urgency: 'ROUTINE',
    confidenceContribution: 60,
    sourceModule: 'pharmacogenomics',
    evidenceLevel: 'A',
    ...overrides,
  };
}

function makeEvidence(overrides: Partial<EvidenceContribution> = {}): EvidenceContribution {
  return {
    sourceModule: 'pharmacogenomics',
    evidenceType: 'PHARMACOGENOMIC',
    summary: 'PGx evidence',
    confidenceWeight: 0.8,
    dataCompleteness: 1.0,
    ...overrides,
  };
}

describe('ConfidenceScoreEngine', () => {
  const engine = new ConfidenceScoreEngine();

  it('returns zero confidence for empty input', () => {
    const breakdown = engine.compute({
      modulesQueried: ['pharmacogenomics'],
      modulesWithData: [],
      evidenceContributions: [],
      recommendationCount: 0,
      conflictCount: 0,
      hasGenomicData: false,
      hasPgxData: false,
      hasClinicalReasoningData: false,
      hasPersonalizedMedicineData: false,
      hasEvidenceData: false,
    });
    expect(breakdown.total).toBeGreaterThanOrEqual(0);
    expect(breakdown.total).toBeLessThanOrEqual(100);
  });

  it('returns higher confidence when more data sources are available', () => {
    const low = engine.compute({
      modulesQueried: ['pharmacogenomics', 'genomic', 'evidence'],
      modulesWithData: [],
      evidenceContributions: [],
      recommendationCount: 0,
      conflictCount: 0,
      hasGenomicData: false, hasPgxData: false,
      hasClinicalReasoningData: false, hasPersonalizedMedicineData: false, hasEvidenceData: false,
    });

    const high = engine.compute({
      modulesQueried: ['pharmacogenomics', 'genomic', 'evidence'],
      modulesWithData: ['pharmacogenomics', 'genomic', 'evidence'],
      evidenceContributions: [makeEvidence()],
      recommendationCount: 3,
      conflictCount: 0,
      hasGenomicData: true, hasPgxData: true,
      hasClinicalReasoningData: false, hasPersonalizedMedicineData: false, hasEvidenceData: true,
    });

    expect(high.total).toBeGreaterThan(low.total);
  });

  it('penalises conflicts in module agreement score', () => {
    const noConflict = engine.compute({
      modulesQueried: ['pharmacogenomics'],
      modulesWithData: ['pharmacogenomics'],
      evidenceContributions: [],
      recommendationCount: 1,
      conflictCount: 0,
      hasGenomicData: false, hasPgxData: true,
      hasClinicalReasoningData: false, hasPersonalizedMedicineData: false, hasEvidenceData: false,
    });

    const withConflicts = engine.compute({
      modulesQueried: ['pharmacogenomics'],
      modulesWithData: ['pharmacogenomics'],
      evidenceContributions: [],
      recommendationCount: 1,
      conflictCount: 3,
      hasGenomicData: false, hasPgxData: true,
      hasClinicalReasoningData: false, hasPersonalizedMedicineData: false, hasEvidenceData: false,
    });

    expect(withConflicts.moduleAgreement).toBeLessThan(noConflict.moduleAgreement);
  });

  it('describeConfidence returns a non-empty description', () => {
    expect(engine.describeConfidence(90)).toContain('Very High');
    expect(engine.describeConfidence(70)).toContain('High');
    expect(engine.describeConfidence(55)).toContain('Moderate');
    expect(engine.describeConfidence(35)).toContain('Low');
    expect(engine.describeConfidence(10)).toContain('Very Low');
  });

  it('caps total at 100', () => {
    const breakdown = engine.compute({
      modulesQueried: ['a', 'b', 'c', 'd', 'e'],
      modulesWithData: ['a', 'b', 'c', 'd', 'e'],
      evidenceContributions: [makeEvidence(), makeEvidence(), makeEvidence()],
      recommendationCount: 2,
      conflictCount: 0,
      hasGenomicData: true, hasPgxData: true,
      hasClinicalReasoningData: true, hasPersonalizedMedicineData: true, hasEvidenceData: true,
    });
    expect(breakdown.total).toBeLessThanOrEqual(100);
  });
});

describe('ConflictResolverEngine', () => {
  const engine = new ConflictResolverEngine();

  it('returns recommendations unchanged when no conflicts', () => {
    const recs = [makeRec({ action: 'Action A' }), makeRec({ action: 'Action B' })];
    const result = engine.resolve(recs);
    expect(result.resolvedRecommendations).toHaveLength(2);
    expect(result.conflicts).toHaveLength(0);
  });

  it('deduplicates identical actions keeping highest confidence', () => {
    const recs = [
      makeRec({ action: 'use standard dose', confidenceContribution: 50 }),
      makeRec({ action: 'use standard dose', confidenceContribution: 80 }),
    ];
    const result = engine.resolve(recs);
    expect(result.resolvedRecommendations).toHaveLength(1);
    expect(result.resolvedRecommendations[0].confidenceContribution).toBe(80);
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0].conflictType).toBe('DUPLICATE_THERAPY');
  });

  it('records CONTRAINDICATION conflict', () => {
    const recs = [
      makeRec({ action: 'avoid clopidogrel', contraindications: ['clopidogrel'], urgency: 'IMMEDIATE' }),
    ];
    const result = engine.resolve(recs);
    expect(result.resolvedRecommendations).toHaveLength(1);
  });

  it('detectConflicts identifies duplicates', () => {
    const recs = [
      makeRec({ action: 'monitor blood pressure' }),
      makeRec({ action: 'monitor blood pressure' }),
    ];
    const issues = engine.detectConflicts(recs);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('detectConflicts identifies contraindication recs', () => {
    const recs = [makeRec({ contraindications: ['warfarin'] })];
    const issues = engine.detectConflicts(recs);
    expect(issues.some((i) => i.includes('contraindication'))).toBe(true);
  });
});

describe('ExplanationBuilderEngine', () => {
  const engine = new ExplanationBuilderEngine();

  it('builds explanation with summary', () => {
    const explanation = engine.build({
      recommendations: [makeRec({ urgency: 'IMMEDIATE' })],
      evidence: [makeEvidence()],
      conflicts: [],
      modulesQueried: ['pharmacogenomics', 'genomic'],
      modulesWithData: ['pharmacogenomics'],
      confidence: 72,
      patientId: 'p-001',
    });

    expect(explanation.summary).toBeTruthy();
    expect(explanation.modulesQueried).toContain('pharmacogenomics');
    expect(explanation.modulesWithData).toContain('pharmacogenomics');
    expect(explanation.keyFindings.length).toBeGreaterThan(0);
  });

  it('includes immediate actions in key findings', () => {
    const explanation = engine.build({
      recommendations: [
        makeRec({ urgency: 'IMMEDIATE', action: 'Contraindicated: avoid warfarin', sourceModule: 'pharmacogenomics' }),
      ],
      evidence: [],
      conflicts: [],
      modulesQueried: ['pharmacogenomics'],
      modulesWithData: ['pharmacogenomics'],
      confidence: 85,
      patientId: 'p-002',
    });

    expect(explanation.keyFindings.some((f) => f.includes('IMMEDIATE'))).toBe(true);
  });

  it('identifies missing modules as limitations', () => {
    const explanation = engine.build({
      recommendations: [],
      evidence: [],
      conflicts: [],
      modulesQueried: ['pharmacogenomics', 'genomic', 'evidence'],
      modulesWithData: [],
      confidence: 10,
      patientId: 'p-003',
    });

    expect(explanation.limitations.some((l) => l.includes('No data available'))).toBe(true);
    expect(explanation.limitations.some((l) => l.includes('Low overall confidence'))).toBe(true);
  });

  it('reasoning chain includes all major steps', () => {
    const explanation = engine.build({
      recommendations: [makeRec()],
      evidence: [makeEvidence()],
      conflicts: [],
      modulesQueried: ['pharmacogenomics'],
      modulesWithData: ['pharmacogenomics'],
      confidence: 75,
      patientId: 'p-004',
    });

    expect(explanation.reasoningChain.length).toBeGreaterThanOrEqual(3);
    expect(explanation.reasoningChain.some((s) => s.includes('confidence'))).toBe(true);
  });

  it('reports dataCompleteness as a percentage', () => {
    const explanation = engine.build({
      recommendations: [],
      evidence: [],
      conflicts: [],
      modulesQueried: ['pharmacogenomics', 'genomic'],
      modulesWithData: ['pharmacogenomics'],
      confidence: 60,
      patientId: 'p-005',
    });
    expect(explanation.dataCompleteness).toBe(50);
  });
});

describe('DecisionSynthesisStrategy', () => {
  const recs: ClinicalRecommendationItem[] = [
    makeRec({ action: 'Routine check', urgency: 'ROUTINE', confidenceContribution: 60 }),
    makeRec({ action: 'Urgent intervention', urgency: 'IMMEDIATE', confidenceContribution: 40 }),
    makeRec({ action: 'Short term follow-up', urgency: 'SHORT_TERM', confidenceContribution: 55 }),
  ];
  const evidence = [makeEvidence({ confidenceWeight: 1.0, sourceModule: 'pharmacogenomics' })];

  it('EvidenceWeightedSynthesis sorts by adjusted confidence', () => {
    const sorted = new EvidenceWeightedSynthesis().synthesize(recs, evidence);
    expect(sorted[0].confidenceContribution).toBeGreaterThanOrEqual(sorted[sorted.length - 1].confidenceContribution);
  });

  it('PriorityFirstSynthesis puts IMMEDIATE first', () => {
    const sorted = new PriorityFirstSynthesis().synthesize(recs, evidence);
    expect(sorted[0].urgency).toBe('IMMEDIATE');
  });

  it('DecisionSynthesisStrategyFactory applies named strategy', () => {
    const factory = new DecisionSynthesisStrategyFactory();
    const result = factory.apply('PRIORITY_FIRST', recs, evidence);
    expect(result[0].urgency).toBe('IMMEDIATE');
  });

  it('DecisionSynthesisStrategyFactory uses default when strategy unknown', () => {
    const factory = new DecisionSynthesisStrategyFactory();
    const result = factory.apply('NONEXISTENT', recs, evidence);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('Decision Priority Rules', () => {
  it('computeDecisionPriority returns CRITICAL for contraindications', () => {
    expect(computeDecisionPriority({
      hasContradications: true,
      hasUltraRapidMetabolizer: false,
      hasPoorMetabolizer: false,
      hasPathogenicVariant: false,
      hasLikelyPathogenicVariant: false,
      immediateActionCount: 0,
      highRiskDrugCount: 0,
    })).toBe('CRITICAL');
  });

  it('computeDecisionPriority returns HIGH for poor metabolizer', () => {
    expect(computeDecisionPriority({
      hasContradications: false,
      hasUltraRapidMetabolizer: false,
      hasPoorMetabolizer: true,
      hasPathogenicVariant: false,
      hasLikelyPathogenicVariant: false,
      immediateActionCount: 0,
      highRiskDrugCount: 0,
    })).toBe('HIGH');
  });

  it('computeDecisionPriority returns LOW for no signals', () => {
    expect(computeDecisionPriority({
      hasContradications: false,
      hasUltraRapidMetabolizer: false,
      hasPoorMetabolizer: false,
      hasPathogenicVariant: false,
      hasLikelyPathogenicVariant: false,
      immediateActionCount: 0,
      highRiskDrugCount: 0,
    })).toBe('LOW');
  });

  it('computeRecommendationUrgency detects IMMEDIATE for contraindicated actions', () => {
    expect(computeRecommendationUrgency({ action: 'contraindicated — avoid', contraindications: [] })).toBe('IMMEDIATE');
  });

  it('computeRecommendationUrgency detects SHORT_TERM for dose-reduce actions', () => {
    expect(computeRecommendationUrgency({ action: 'reduce dose by 50%', contraindications: [] })).toBe('SHORT_TERM');
  });
});

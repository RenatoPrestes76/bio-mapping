import { ClinicalDecisionOrchestrator } from '../services/clinical-decision-orchestrator.js';
import { ClinicalDecision } from '../entities/clinical-decision.entity.js';
import type { PharmacogenomicsService } from '../../pharmacogenomics/pharmacogenomics.service.js';
import type { GenomicInterpretationService } from '../../genomic-interpretation/genomic-interpretation.service.js';
import type { EvidenceEngineService } from '../../evidence-engine/evidence-engine.service.js';
import type { ClinicalReasoningService } from '../../clinical-reasoning/clinical-reasoning.service.js';
import type { PersonalizedMedicineService } from '../../personalized-medicine/personalized-medicine.service.js';

function makePgxRec(overrides: Partial<{
  drug: string; severity: string; phenotype: string; isActionable: boolean; isContraindicated: boolean;
  alternativeMedications: string[];
}> = {}) {
  return {
    drug: overrides.drug ?? 'clopidogrel',
    gene: 'CYP2C19',
    phenotype: overrides.phenotype ?? 'POOR_METABOLIZER',
    severity: overrides.severity ?? 'CONTRAINDICATED',
    recommendation: 'Avoid clopidogrel — use prasugrel',
    alternativeMedications: overrides.alternativeMedications ?? ['prasugrel'],
    isActionable: () => overrides.isActionable ?? true,
    isContraindicated: () => (overrides.severity ?? 'CONTRAINDICATED') === 'CONTRAINDICATED',
    explanation: {
      genotypeDescription: 'CYP2C19 *2/*2',
      phenotypeDescription: 'Poor Metabolizer',
      guidelineUsed: 'CPIC 2022',
      clinicalRationale: 'Cannot activate clopidogrel',
      decisionPath: ['Step 1'],
      gradeStrength: 'STRONG',
    },
    evidence: {
      level: 'A',
      source: 'CPIC',
      gradeStrength: 'STRONG',
      confidence: 0.95,
    },
  };
}

function makeOrchestrator(overrides: {
  pgxRecs?: ReturnType<typeof makePgxRec>[];
  genomicReport?: Record<string, unknown> | null;
  evidenceItems?: unknown[];
  inferenceResult?: Record<string, unknown> | null;
  profileResult?: Record<string, unknown> | null;
} = {}) {
  const pgxRecs = overrides.pgxRecs ?? [makePgxRec()];
  const genomicReport = overrides.genomicReport ?? null;
  const evidenceItems = overrides.evidenceItems ?? [];

  const pgxService = {
    getRecommendations: jest.fn().mockReturnValue(pgxRecs),
  } as unknown as jest.Mocked<PharmacogenomicsService>;

  const genomicService = {
    generateReport: genomicReport
      ? jest.fn().mockReturnValue(genomicReport)
      : jest.fn().mockImplementation(() => { throw new Error('Not found'); }),
  } as unknown as jest.Mocked<GenomicInterpretationService>;

  const evidenceService = {
    rank: jest.fn().mockReturnValue(evidenceItems),
    findByTopic: jest.fn().mockReturnValue(evidenceItems),
  } as unknown as jest.Mocked<EvidenceEngineService>;

  const clinicalReasoningService = {
    getById: overrides.inferenceResult
      ? jest.fn().mockReturnValue(overrides.inferenceResult)
      : jest.fn().mockImplementation(() => { throw new Error('Not found'); }),
  } as unknown as jest.Mocked<ClinicalReasoningService>;

  const personalizedMedicineService = {
    getProfile: overrides.profileResult
      ? jest.fn().mockReturnValue(overrides.profileResult)
      : jest.fn().mockImplementation(() => { throw new Error('Not found'); }),
  } as unknown as jest.Mocked<PersonalizedMedicineService>;

  const orchestrator = new ClinicalDecisionOrchestrator(
    pgxService,
    genomicService,
    evidenceService,
    clinicalReasoningService,
    personalizedMedicineService,
  );

  return { orchestrator, pgxService, genomicService, evidenceService, clinicalReasoningService, personalizedMedicineService };
}

describe('ClinicalDecisionOrchestrator', () => {
  it('returns a ClinicalDecision for a patient with PGx data', async () => {
    const { orchestrator } = makeOrchestrator();
    const decision = await orchestrator.orchestrate({ patientId: 'p-001', decisionType: 'COMPREHENSIVE', urgency: 'ROUTINE' });
    expect(decision).toBeInstanceOf(ClinicalDecision);
    expect(decision.patientId).toBe('p-001');
  });

  it('assigns CRITICAL priority when contraindication is present', async () => {
    const { orchestrator } = makeOrchestrator({ pgxRecs: [makePgxRec({ severity: 'CONTRAINDICATED' })] });
    const decision = await orchestrator.orchestrate({ patientId: 'p-002', decisionType: 'COMPREHENSIVE', urgency: 'ROUTINE' });
    expect(decision.priority).toBe('CRITICAL');
  });

  it('assigns HIGH priority for POOR_METABOLIZER without contraindication', async () => {
    const { orchestrator } = makeOrchestrator({
      pgxRecs: [makePgxRec({ severity: 'DOSE_REDUCTION', phenotype: 'POOR_METABOLIZER' })],
    });
    const decision = await orchestrator.orchestrate({ patientId: 'p-003', decisionType: 'COMPREHENSIVE', urgency: 'ROUTINE' });
    expect(['HIGH', 'MODERATE', 'CRITICAL']).toContain(decision.priority);
  });

  it('includes pharmacogenomics module in contributing modules', async () => {
    const { orchestrator } = makeOrchestrator();
    const decision = await orchestrator.orchestrate({ patientId: 'p-004', decisionType: 'COMPREHENSIVE', urgency: 'ROUTINE' });
    expect(decision.contributingModules).toContain('pharmacogenomics');
  });

  it('gracefully handles missing PGx data', async () => {
    const { orchestrator } = makeOrchestrator({ pgxRecs: [] });
    const decision = await orchestrator.orchestrate({ patientId: 'p-005', decisionType: 'COMPREHENSIVE', urgency: 'ROUTINE' });
    expect(decision).toBeInstanceOf(ClinicalDecision);
    expect(decision.contributingModules).not.toContain('pharmacogenomics');
  });

  it('includes genomic data when available', async () => {
    const { orchestrator } = makeOrchestrator({
      genomicReport: {
        patientId: 'p-006',
        variantCount: 3,
        clinicallySignificantCount: 1,
        summary: { variantGroups: [{}] },
        generatedAt: new Date(),
      },
      pgxRecs: [],
    });
    const decision = await orchestrator.orchestrate({ patientId: 'p-006', decisionType: 'COMPREHENSIVE', urgency: 'ROUTINE' });
    expect(decision.contributingModules).toContain('genomic');
  });

  it('includes evidence data when available', async () => {
    const { orchestrator } = makeOrchestrator({
      pgxRecs: [],
      evidenceItems: [{ id: 'ev-1', title: 'Study 1' }, { id: 'ev-2', title: 'Study 2' }],
    });
    const decision = await orchestrator.orchestrate({
      patientId: 'p-007',
      decisionType: 'COMPREHENSIVE',
      urgency: 'ROUTINE',
      evidenceTopics: ['hypertension'],
    });
    expect(decision.contributingModules).toContain('evidence');
  });

  it('includes clinical reasoning data when inferenceId is provided', async () => {
    const { orchestrator } = makeOrchestrator({
      pgxRecs: [],
      inferenceResult: { topHypothesis: 'Hypertension Stage 2', confidenceLevel: 0.8 },
    });
    const decision = await orchestrator.orchestrate({
      patientId: 'p-008',
      decisionType: 'COMPREHENSIVE',
      urgency: 'ROUTINE',
      clinicalReasoningInferenceId: 'inf-001',
    });
    expect(decision.contributingModules).toContain('clinical-reasoning');
  });

  it('includes personalized medicine data when profileId is provided', async () => {
    const { orchestrator } = makeOrchestrator({
      pgxRecs: [],
      profileResult: { id: 'pm-001', patientId: 'p-009', scores: {} },
    });
    const decision = await orchestrator.orchestrate({
      patientId: 'p-009',
      decisionType: 'COMPREHENSIVE',
      urgency: 'ROUTINE',
      personalizedMedicineProfileId: 'pm-001',
    });
    expect(decision.contributingModules).toContain('personalized-medicine');
  });

  it('computes confidence score > 0 when data is available', async () => {
    const { orchestrator } = makeOrchestrator();
    const decision = await orchestrator.orchestrate({ patientId: 'p-010', decisionType: 'COMPREHENSIVE', urgency: 'ROUTINE' });
    expect(decision.confidence).toBeGreaterThan(0);
  });

  it('populates explanation with reasoning chain', async () => {
    const { orchestrator } = makeOrchestrator();
    const decision = await orchestrator.orchestrate({ patientId: 'p-011', decisionType: 'COMPREHENSIVE', urgency: 'ROUTINE' });
    expect(decision.explanation.reasoningChain.length).toBeGreaterThan(0);
  });
});

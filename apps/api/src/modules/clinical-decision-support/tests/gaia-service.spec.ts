import { NotFoundException } from '@nestjs/common';
import { GaiaClinicalDecisionService } from '../clinical-decision-support.service.js';
import { ClinicalDecisionOrchestrator } from '../services/clinical-decision-orchestrator.js';
import { ClinicalDecisionSupportProvider } from '../providers/clinical-decision-support.provider.js';
import { ClinicalDecision } from '../entities/clinical-decision.entity.js';

function makeDecision(patientId = 'p-001'): ClinicalDecision {
  return new ClinicalDecision({
    patientId,
    decisionType: 'COMPREHENSIVE',
    priority: 'HIGH',
    confidence: 75,
    clinicalSummary: 'Test decision summary',
    recommendations: [],
    evidence: [],
    explanation: {
      summary: 'Test',
      contributingModules: ['pharmacogenomics'],
      keyFindings: [],
      conflictsResolved: 0,
      reasoningChain: [],
      limitations: [],
      dataCompleteness: 80,
      modulesQueried: ['pharmacogenomics'],
      modulesWithData: ['pharmacogenomics'],
    },
    contributingModules: ['pharmacogenomics'],
  });
}

describe('GaiaClinicalDecisionService', () => {
  let service: GaiaClinicalDecisionService;
  let orchestrator: jest.Mocked<ClinicalDecisionOrchestrator>;
  let provider: ClinicalDecisionSupportProvider;

  beforeEach(() => {
    orchestrator = {
      orchestrate: jest.fn(),
    } as unknown as jest.Mocked<ClinicalDecisionOrchestrator>;

    provider = new ClinicalDecisionSupportProvider();
    service = new GaiaClinicalDecisionService(orchestrator, provider);
  });

  it('analyze calls orchestrator and stores result', async () => {
    const decision = makeDecision();
    orchestrator.orchestrate.mockResolvedValue(decision);

    const result = await service.analyze({ patientId: 'p-001', decisionType: 'COMPREHENSIVE', urgency: 'ROUTINE' });

    expect(orchestrator.orchestrate).toHaveBeenCalledTimes(1);
    expect(result.patientId).toBe('p-001');
    expect(provider.getById(result.id)).toBeDefined();
  });

  it('getDecision returns stored decision by id', async () => {
    const decision = makeDecision();
    orchestrator.orchestrate.mockResolvedValue(decision);
    const stored = await service.analyze({ patientId: 'p-001', decisionType: 'COMPREHENSIVE', urgency: 'ROUTINE' });

    const fetched = service.getDecision(stored.id);
    expect(fetched.id).toBe(stored.id);
  });

  it('getDecision throws NotFoundException for unknown id', () => {
    expect(() => service.getDecision('nonexistent')).toThrow(NotFoundException);
  });

  it('getReport returns history for patient', async () => {
    const decision = makeDecision('p-002');
    orchestrator.orchestrate.mockResolvedValue(decision);
    await service.analyze({ patientId: 'p-002', decisionType: 'COMPREHENSIVE', urgency: 'ROUTINE' });

    const report = service.getReport('p-002');
    expect(report.totalDecisions).toBe(1);
    expect(report.latestDecision.patientId).toBe('p-002');
    expect(report.history).toHaveLength(1);
  });

  it('getReport throws NotFoundException for unknown patient', () => {
    expect(() => service.getReport('nobody')).toThrow(NotFoundException);
  });

  it('multiple analyses for same patient accumulate in history', async () => {
    const d1 = makeDecision('p-003');
    const d2 = makeDecision('p-003');
    orchestrator.orchestrate
      .mockResolvedValueOnce(d1)
      .mockResolvedValueOnce(d2);

    await service.analyze({ patientId: 'p-003', decisionType: 'COMPREHENSIVE', urgency: 'ROUTINE' });
    await service.analyze({ patientId: 'p-003', decisionType: 'COMPREHENSIVE', urgency: 'ROUTINE' });

    const report = service.getReport('p-003');
    expect(report.totalDecisions).toBe(2);
  });

  it('getDecisionsByPatient returns empty array for unknown patient', () => {
    expect(service.getDecisionsByPatient('nobody')).toHaveLength(0);
  });
});

describe('ClinicalDecisionSupportProvider', () => {
  let provider: ClinicalDecisionSupportProvider;

  beforeEach(() => {
    provider = new ClinicalDecisionSupportProvider();
  });

  it('count returns 0 initially', () => {
    expect(provider.count()).toBe(0);
  });

  it('store and getById work correctly', () => {
    const d = makeDecision();
    provider.store(d);
    expect(provider.getById(d.id)).toBe(d);
    expect(provider.count()).toBe(1);
  });

  it('getByPatient returns decisions for patient in reverse-inserted order', () => {
    const d1 = makeDecision('p-001');
    const d2 = makeDecision('p-001');
    provider.store(d1);
    provider.store(d2);
    const results = provider.getByPatient('p-001');
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe(d2.id);
  });

  it('getLatestByPatient returns most recently stored decision', () => {
    const d1 = makeDecision('p-002');
    const d2 = makeDecision('p-002');
    provider.store(d1);
    provider.store(d2);
    expect(provider.getLatestByPatient('p-002')?.id).toBe(d2.id);
  });

  it('list returns all stored decisions', () => {
    provider.store(makeDecision('p-003'));
    provider.store(makeDecision('p-004'));
    expect(provider.list()).toHaveLength(2);
  });
});

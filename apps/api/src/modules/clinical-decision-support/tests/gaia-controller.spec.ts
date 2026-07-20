import { Test, TestingModule } from '@nestjs/testing';
import { GaiaClinicalDecisionController } from '../clinical-decision-support.controller.js';
import { GaiaClinicalDecisionService } from '../clinical-decision-support.service.js';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { ClinicalDecision } from '../entities/clinical-decision.entity.js';

function makeDecision(patientId = 'p-ctrl'): ClinicalDecision {
  return new ClinicalDecision({
    id: 'cds-ctrl-001',
    patientId,
    decisionType: 'COMPREHENSIVE',
    priority: 'HIGH',
    confidence: 80,
    clinicalSummary: 'Controller test decision',
    recommendations: [],
    evidence: [],
    explanation: {
      summary: 'Test',
      contributingModules: ['pharmacogenomics'],
      keyFindings: ['Finding 1'],
      conflictsResolved: 0,
      reasoningChain: ['Step 1'],
      limitations: [],
      dataCompleteness: 80,
      modulesQueried: ['pharmacogenomics'],
      modulesWithData: ['pharmacogenomics'],
    },
    contributingModules: ['pharmacogenomics'],
  });
}

describe('GaiaClinicalDecisionController', () => {
  let controller: GaiaClinicalDecisionController;
  let service: jest.Mocked<GaiaClinicalDecisionService>;

  beforeEach(async () => {
    service = {
      analyze: jest.fn(),
      getDecision: jest.fn(),
      getReport: jest.fn(),
      getDecisionsByPatient: jest.fn(),
    } as unknown as jest.Mocked<GaiaClinicalDecisionService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GaiaClinicalDecisionController],
      providers: [{ provide: GaiaClinicalDecisionService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(GaiaClinicalDecisionController);
  });

  it('POST /clinical-decision-support/analyze calls service.analyze', async () => {
    const decision = makeDecision();
    service.analyze.mockResolvedValue(decision);

    const result = await controller.analyze(
      { patientId: 'p-ctrl', decisionType: 'COMPREHENSIVE', urgency: 'ROUTINE' },
      { sub: 'user-001' },
    );

    expect(service.analyze).toHaveBeenCalledTimes(1);
    expect(result.patientId).toBe('p-ctrl');
    expect(result.confidence).toBe(80);
  });

  it('GET /clinical-decision-support/report/:patientId calls service.getReport', () => {
    const decision = makeDecision('p-ctrl');
    service.getReport.mockReturnValue({
      latestDecision: decision,
      history: [decision],
      totalDecisions: 1,
    });

    const result = controller.getReport('p-ctrl', { sub: 'user-001' });

    expect(service.getReport).toHaveBeenCalledWith('p-ctrl');
    expect(result.totalDecisions).toBe(1);
    expect(result.latestDecision.confidence).toBe(80);
  });

  it('GET /clinical-decision-support/:id calls service.getDecision', () => {
    const decision = makeDecision();
    service.getDecision.mockReturnValue(decision);

    const result = controller.getDecision('cds-ctrl-001', { sub: 'user-001' });

    expect(service.getDecision).toHaveBeenCalledWith('cds-ctrl-001');
    expect(result.id).toBe('cds-ctrl-001');
  });

  it('POST analyze with all optional fields passes them through', async () => {
    const decision = makeDecision('p-full');
    service.analyze.mockResolvedValue(decision);

    await controller.analyze(
      {
        patientId: 'p-full',
        decisionType: 'THERAPEUTIC',
        urgency: 'IMMEDIATE',
        pgxPatientId: 'p-full',
        genomicPatientId: 'p-full',
        clinicalReasoningInferenceId: 'inf-001',
        personalizedMedicineProfileId: 'pm-001',
        evidenceTopics: ['hypertension'],
      },
      { sub: 'user-001' },
    );

    expect(service.analyze).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'p-full', decisionType: 'THERAPEUTIC' }),
    );
  });
});

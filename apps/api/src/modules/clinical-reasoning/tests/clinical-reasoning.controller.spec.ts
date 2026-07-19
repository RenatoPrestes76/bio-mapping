import { Test, TestingModule } from '@nestjs/testing';
import { ClinicalReasoningController } from '../clinical-reasoning.controller.js';
import { ClinicalReasoningService } from '../clinical-reasoning.service.js';
import { Sex } from '../entities/clinical-case.entity.js';
import { InferenceResult, AlertSeverity } from '../entities/inference-result.entity.js';
import { ClinicalHypothesis } from '../entities/clinical-hypothesis.entity.js';

const makeInference = (id: string): InferenceResult =>
  new InferenceResult({
    id,
    patientId: 'patient-1',
    hypotheses: [new ClinicalHypothesis({ id: 'h1', condition: 'Test', probability: 0.8, confidence: 0.9 })],
    recommendations: ['rec1'],
    alerts: [],
    steps: [],
    confidence: 0.85,
  });

describe('ClinicalReasoningController', () => {
  let controller: ClinicalReasoningController;
  let service: jest.Mocked<ClinicalReasoningService>;

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<ClinicalReasoningService>> = {
      analyze: jest.fn(),
      infer: jest.fn(),
      simulate: jest.fn(),
      getById: jest.fn(),
      explain: jest.fn(),
      trace: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClinicalReasoningController],
      providers: [{ provide: ClinicalReasoningService, useValue: mockService }],
    })
      .overrideGuard(require('../../../modules/identity/auth/guards/jwt-auth.guard.js').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ClinicalReasoningController>(ClinicalReasoningController);
    service = module.get(ClinicalReasoningService);
  });

  it('analyze calls service.analyze and returns result', () => {
    const result = makeInference('inf-1');
    service.analyze.mockReturnValue(result);
    const dto = { patientId: 'p1', age: 45, sex: Sex.MALE };
    expect(controller.analyze(dto)).toBe(result);
    expect(service.analyze).toHaveBeenCalledWith(dto);
  });

  it('infer calls service.infer and returns result', () => {
    const result = makeInference('inf-2');
    service.infer.mockReturnValue(result);
    const dto = { patientId: 'p2', age: 50, sex: Sex.FEMALE };
    expect(controller.infer(dto)).toBe(result);
    expect(service.infer).toHaveBeenCalledWith(dto);
  });

  it('simulate calls service.simulate', () => {
    const sim = { baseCase: makeInference('inf-3'), scenarios: [] };
    service.simulate.mockReturnValue(sim);
    const dto = { patientId: 'p3', age: 50, sex: Sex.MALE, scenarios: [] };
    expect(controller.simulate(dto)).toBe(sim);
    expect(service.simulate).toHaveBeenCalledWith(dto);
  });

  it('findOne calls service.getById', () => {
    const result = makeInference('inf-4');
    service.getById.mockReturnValue(result);
    expect(controller.findOne('inf-4')).toBe(result);
    expect(service.getById).toHaveBeenCalledWith('inf-4');
  });

  it('getExplanation calls service.explain', () => {
    const exp = { inferenceId: 'inf-5', explanation: 'test', hypothesesCount: 1, topCondition: 'T', confidenceLevel: 'ALTA' };
    service.explain.mockReturnValue(exp);
    expect(controller.getExplanation('inf-5')).toBe(exp);
    expect(service.explain).toHaveBeenCalledWith('inf-5');
  });

  it('getTrace calls service.trace', () => {
    const trace = { inferenceId: 'inf-6', steps: [], totalSteps: 0, totalDuration: 0 };
    service.trace.mockReturnValue(trace);
    expect(controller.getTrace('inf-6')).toBe(trace);
    expect(service.trace).toHaveBeenCalledWith('inf-6');
  });
});

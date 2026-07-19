import { ClinicalReasoningService } from '../clinical-reasoning.service.js';
import { ClinicalReasoningProvider } from '../providers/clinical-reasoning.provider.js';
import { Sex } from '../entities/clinical-case.entity.js';
import { InferenceResult } from '../entities/inference-result.entity.js';
import { NotFoundException } from '@nestjs/common';

describe('ClinicalReasoningService', () => {
  let service: ClinicalReasoningService;
  let provider: ClinicalReasoningProvider;

  beforeEach(() => {
    provider = new ClinicalReasoningProvider();
    service = new ClinicalReasoningService(provider);
  });

  it('analyze returns InferenceResult', () => {
    const result = service.analyze({ patientId: 'p1', age: 45, sex: Sex.MALE });
    expect(result).toBeInstanceOf(InferenceResult);
  });

  it('infer delegates to analyze', () => {
    const spy = jest.spyOn(service, 'analyze');
    service.infer({ patientId: 'p2', age: 50, sex: Sex.FEMALE });
    expect(spy).toHaveBeenCalled();
  });

  it('getById returns stored result', () => {
    const result = service.analyze({ patientId: 'p3', age: 40, sex: Sex.OTHER });
    const fetched = service.getById(result.id);
    expect(fetched.id).toBe(result.id);
  });

  it('getById throws NotFoundException for unknown id', () => {
    expect(() => service.getById('non-existent-id')).toThrow(NotFoundException);
    expect(() => service.getById('non-existent-id')).toThrow("Inference 'non-existent-id' not found");
  });

  it('explain returns ExplanationResult with inferenceId', () => {
    const result = service.analyze({
      patientId: 'p4',
      age: 55,
      sex: Sex.MALE,
      biomarkers: [{ name: 'fasting_glucose', value: 135 }],
    });
    const exp = service.explain(result.id);
    expect(exp.inferenceId).toBe(result.id);
    expect(typeof exp.explanation).toBe('string');
    expect(exp.explanation).toBeTruthy();
  });

  it('explain returns confidenceLevel HIGH for confidence >= 0.8', () => {
    const result = service.analyze({ patientId: 'p5', age: 40, sex: Sex.FEMALE });
    const stored = provider.getById(result.id)!;
    Object.defineProperty(stored, 'confidence', { value: 0.85, writable: true });
    const exp = service.explain(result.id);
    expect(exp.confidenceLevel).toBe('ALTA');
  });

  it('trace returns steps array', () => {
    const result = service.analyze({
      patientId: 'p6',
      age: 50,
      sex: Sex.MALE,
      biomarkers: [{ name: 'systolic_bp', value: 150 }],
    });
    const trace = service.trace(result.id);
    expect(trace.inferenceId).toBe(result.id);
    expect(Array.isArray(trace.steps)).toBe(true);
    expect(trace.totalSteps).toBeGreaterThan(0);
  });

  it('simulate returns baseCase and scenarios', () => {
    const sim = service.simulate({
      patientId: 'p7',
      age: 50,
      sex: Sex.MALE,
      scenarios: [
        { description: 'With obesity', addConditions: ['obesidade'], biomarkerOverrides: [{ name: 'bmi', value: 33 }] },
      ],
    });
    expect(sim.baseCase).toBeInstanceOf(InferenceResult);
    expect(sim.scenarios).toHaveLength(1);
    expect(sim.scenarios[0].scenarioId).toBe('scenario-1');
    expect(sim.scenarios[0].result).toBeInstanceOf(InferenceResult);
  });

  it('validate returns valid for complete dto', () => {
    const v = service.validate({ patientId: 'p8', age: 40, sex: Sex.MALE });
    expect(v.valid).toBe(true);
  });

  it('validate returns invalid for missing patientId', () => {
    const v = service.validate({ patientId: '', age: 40, sex: Sex.MALE });
    expect(v.valid).toBe(false);
    expect(v.issues.length).toBeGreaterThan(0);
  });

  it('validate returns invalid for age <= 0', () => {
    const v = service.validate({ patientId: 'p9', age: 0, sex: Sex.MALE });
    expect(v.valid).toBe(false);
  });

  it('validate warns when no conditions/symptoms/biomarkers', () => {
    const v = service.validate({ patientId: 'p10', age: 40, sex: Sex.MALE });
    expect(v.warnings.length).toBeGreaterThan(0);
  });
});

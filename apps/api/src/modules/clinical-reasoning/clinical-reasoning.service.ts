import { Injectable, NotFoundException } from '@nestjs/common';
import { ClinicalReasoningProvider } from './providers/clinical-reasoning.provider.js';
import { ClinicalCase } from './entities/clinical-case.entity.js';
import { InferenceResult } from './entities/inference-result.entity.js';
import { AnalyzeCaseDto, SimulateCaseDto } from './dto/analyze-case.dto.js';

export interface ExplanationResult {
  inferenceId: string;
  explanation: string;
  hypothesesCount: number;
  topCondition: string | null;
  confidenceLevel: string;
}

export interface TraceResult {
  inferenceId: string;
  steps: Array<{
    strategyName: string;
    description: string;
    confidence: number;
    duration: number;
  }>;
  totalSteps: number;
  totalDuration: number;
}

export interface SimulationResult {
  baseCase: InferenceResult;
  scenarios: Array<{
    scenarioId: string;
    description: string;
    result: InferenceResult;
    probabilityDelta: number;
  }>;
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
  score: number;
}

@Injectable()
export class ClinicalReasoningService {
  constructor(private readonly provider: ClinicalReasoningProvider) {}

  analyze(dto: AnalyzeCaseDto): InferenceResult {
    const clinicalCase = new ClinicalCase({
      patientId: dto.patientId,
      age: dto.age,
      sex: dto.sex,
      conditions: dto.conditions ?? [],
      symptoms: dto.symptoms ?? [],
      biomarkers: dto.biomarkers ?? [],
      medications: dto.medications ?? [],
      lifestyle: dto.lifestyle ?? {},
      familyHistory: dto.familyHistory ?? [],
    });
    return this.provider.analyze(clinicalCase);
  }

  infer(dto: AnalyzeCaseDto): InferenceResult {
    return this.analyze(dto);
  }

  getById(inferenceId: string): InferenceResult {
    const result = this.provider.getById(inferenceId);
    if (!result) {
      throw new NotFoundException(`Inference '${inferenceId}' not found`);
    }
    return result;
  }

  explain(inferenceId: string): ExplanationResult {
    const result = this.getById(inferenceId);
    const top = result.getTopHypotheses(1)[0] ?? null;
    const confidenceLabel =
      result.confidence >= 0.8 ? 'ALTA' : result.confidence >= 0.6 ? 'MODERADA' : 'BAIXA';

    return {
      inferenceId,
      explanation: result.getExplanation(),
      hypothesesCount: result.hypotheses.length,
      topCondition: top?.condition ?? null,
      confidenceLevel: confidenceLabel,
    };
  }

  trace(inferenceId: string): TraceResult {
    const result = this.getById(inferenceId);
    const steps = result.steps.map((s) => ({
      strategyName: s.strategyName,
      description: s.description,
      confidence: s.confidence,
      duration: s.duration,
    }));
    const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);

    return {
      inferenceId,
      steps,
      totalSteps: steps.length,
      totalDuration,
    };
  }

  simulate(dto: SimulateCaseDto): SimulationResult {
    const base = this.analyze(dto);
    const baseTopScore = base.getTopHypotheses(1)[0]?.overallScore() ?? 0;
    const scenarios = (dto.scenarios ?? []).map((scenario, idx) => {
      const scenarioDto: AnalyzeCaseDto = {
        ...dto,
        conditions: [...(dto.conditions ?? []), ...(scenario.addConditions ?? [])],
        biomarkers: [
          ...(dto.biomarkers ?? []),
          ...(scenario.biomarkerOverrides ?? []),
        ],
        lifestyle: { ...(dto.lifestyle ?? {}), ...(scenario.lifestyleOverrides ?? {}) },
      };
      const result = this.analyze(scenarioDto);
      const scenarioScore = result.getTopHypotheses(1)[0]?.overallScore() ?? 0;

      return {
        scenarioId: `scenario-${idx + 1}`,
        description: scenario.description ?? `Scenario ${idx + 1}`,
        result,
        probabilityDelta: scenarioScore - baseTopScore,
      };
    });

    return { baseCase: base, scenarios };
  }

  validate(dto: AnalyzeCaseDto): ValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];

    if (!dto.patientId || dto.patientId.trim() === '') {
      issues.push('patientId é obrigatório');
    }
    if (!dto.age || dto.age <= 0) {
      issues.push('age deve ser maior que 0');
    }
    if (dto.age > 120) {
      warnings.push('age acima de 120 anos — verificar dados');
    }
    if (!dto.conditions?.length && !dto.symptoms?.length && !dto.biomarkers?.length) {
      warnings.push('Nenhuma condição, sintoma ou biomarcador fornecido — análise pode ser inconclusiva');
    }

    const score = issues.length === 0 ? (warnings.length === 0 ? 1.0 : 0.7) : 0.0;
    return { valid: issues.length === 0, issues, warnings, score };
  }
}

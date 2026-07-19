import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service.js';
import { AuditLogService } from '../../../../common/audit/audit-log.service.js';
import { SimulationRepository } from '../repositories/simulation.repository.js';
import { buildDigitalTwin } from '../engine/twin-builder.js';
import { runSimulation } from '../engine/simulation-runner.js';
import { buildComparisonEntry, compareSimulations } from '../engine/comparison-engine.js';
import { BUILT_IN_SCENARIOS, type ScenarioType, type TimeHorizon } from '../engine/scenario-engine.js';
import type { RunSimulationDto, CompareSimulationsDto } from '../dto/run-simulation.dto.js';
import type {
  DigitalTwin,
  SimulationRun,
  SimulationResult,
  SimulationHistory,
} from '@bio/database';

const MODEL_VERSION = '1.0';

@Injectable()
export class SimulationService {
  constructor(
    private readonly repository: SimulationRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  // ── Build / Refresh Digital Twin ──────────────────────────────────────────

  async buildOrRefreshTwin(patientId: string, tenantId: string | undefined, userId: string): Promise<DigitalTwin> {
    const profile = await this.prisma.patientProfile.findUnique({ where: { patientId } });
    if (!profile) throw new NotFoundException(`Perfil do paciente ${patientId} não encontrado`);

    const latestRisk = await this.prisma.personalizedRisk.findFirst({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    const twinData = buildDigitalTwin({
      patientId,
      tenantId: tenantId ?? (profile.tenantId ?? undefined),
      age: profile.age ?? undefined,
      sex: (profile.sex as string | null) ?? undefined,
      occupation: profile.occupation ?? undefined,
      bmi: profile.bmi ?? undefined,
      weight: profile.weight ?? undefined,
      height: profile.height ?? undefined,
      smoking: profile.smoking,
      alcohol: (profile.alcohol as string | null) ?? undefined,
      lifestyle: (profile.lifestyle as string | null) ?? undefined,
      pregnant: profile.pregnant ?? undefined,
      menopausal: profile.menopausal ?? undefined,
      familyHistory: (profile.familyHistory as string[] | null) ?? [],
      conditions: (profile.conditions as string[] | null) ?? [],
      medications: (profile.medications as string[] | null) ?? [],
      baseRiskScore: latestRisk?.baseRiskScore ?? 0.3,
      currentRiskLevel: latestRisk ? (latestRisk.riskLevel as string) : undefined,
    });

    const twin = await this.repository.upsertDigitalTwin({
      patientId: twinData.patientId,
      tenantId: twinData.tenantId,
      demographics: twinData.demographics as object,
      clinicalHistory: twinData.clinicalHistory as object,
      biomarkers: twinData.biomarkers as object,
      riskFactors: twinData.riskFactors as unknown as object,
      lifestyle: twinData.lifestyle as object,
      longitudinalData: twinData.longitudinalData as object,
      activeRecommendations: twinData.activeRecommendations as unknown as object,
      dataCompleteness: twinData.dataCompleteness,
      missingFields: twinData.missingFields as unknown as object,
    });

    await this.audit.log('SIMULATION_TWIN_BUILT', { userId, metadata: { patientId, dataCompleteness: twinData.dataCompleteness } });
    return twin;
  }

  // ── Run Simulation ────────────────────────────────────────────────────────

  async runSimulation(dto: RunSimulationDto, userId: string): Promise<{ run: SimulationRun; result: SimulationResult }> {
    const twin = await this.buildOrRefreshTwin(dto.patientId, dto.tenantId, userId);

    const twinModel = buildDigitalTwin({
      patientId: (twin.patientId as string),
      tenantId: twin.tenantId ?? undefined,
      ...(twin.demographics as Record<string, unknown>),
      ...(twin.lifestyle as Record<string, unknown> ?? {}),
      smoking: ((twin.lifestyle as Record<string, unknown> | null)?.smoking as boolean) ?? false,
      familyHistory: (twin.riskFactors as string[] | null) ?? [],
      conditions: ((twin.clinicalHistory as Record<string, unknown> | null)?.conditions as string[]) ?? [],
      medications: ((twin.clinicalHistory as Record<string, unknown> | null)?.medications as string[]) ?? [],
      baseRiskScore: ((twin.clinicalHistory as Record<string, unknown> | null)?.baseRiskScore as number) ?? 0.3,
    } as any);

    const output = runSimulation({
      twin: {
        ...twinModel,
        demographics: twin.demographics as Record<string, unknown>,
        clinicalHistory: (twin.clinicalHistory ?? {}) as Record<string, unknown>,
        biomarkers: (twin.biomarkers ?? {}) as Record<string, unknown>,
        riskFactors: (twin.riskFactors as string[] | null) ?? [],
        lifestyle: (twin.lifestyle ?? {}) as Record<string, unknown>,
        longitudinalData: (twin.longitudinalData ?? { metrics: [] }) as Record<string, unknown>,
        activeRecommendations: (twin.activeRecommendations as string[] | null) ?? [],
        dataCompleteness: twin.dataCompleteness,
        missingFields: (twin.missingFields as string[] | null) ?? [],
      },
      scenarioType: dto.scenarioType as ScenarioType,
      parameters: dto.parameters,
      timeHorizon: dto.timeHorizon as TimeHorizon,
    });

    const run = await this.repository.createSimulationRun({
      tenantId: dto.tenantId,
      patientId: dto.patientId,
      twinId: twin.id,
      createdBy: userId,
      scenarioType: dto.scenarioType as any,
      scenarioLabel: output.scenarioLabel,
      timeHorizon: dto.timeHorizon as any,
      modelVersion: MODEL_VERSION,
    });

    if (dto.parameters && Object.keys(dto.parameters).length > 0) {
      await this.repository.createSimulationParameters(run.id, dto.parameters);
    }

    const result = await this.repository.createSimulationResult({
      runId: run.id,
      baselineRiskScore: output.baselineRiskScore,
      simulatedRiskScore: output.simulatedRiskScore,
      expectedRiskVariation: output.expectedRiskVariation,
      confidence: output.confidence,
      baselineRiskLevel: output.baselineRiskLevel,
      simulatedRiskLevel: output.simulatedRiskLevel,
      topFactors: output.topFactors as unknown as object,
    });

    const allAssumptions = [
      ...output.assumptions.map((a) => ({ category: 'PREMISSA', description: a })),
      ...output.limitations.map((l) => ({ category: 'LIMITAÇÃO', description: l })),
      ...output.missingData.map((m) => ({ category: 'DADO_AUSENTE', description: m })),
    ];
    await this.repository.createSimulationAssumptions(run.id, allAssumptions);

    await this.repository.createSimulationHistory({
      tenantId: dto.tenantId,
      patientId: dto.patientId,
      runId: run.id,
      userId,
      action: 'SIMULATION_RUN',
      summary: `Cenário: ${output.scenarioLabel} | Horizonte: ${output.timeHorizonLabel} | Variação: ${output.expectedRiskVariation}pp | Confiança: ${Math.round(output.confidence * 100)}%`,
    });

    await this.audit.log('SIMULATION_RUN_CREATED', {
      userId,
      metadata: { patientId: dto.patientId, scenario: dto.scenarioType, timeHorizon: dto.timeHorizon, riskVariation: output.expectedRiskVariation },
    });

    return { run, result };
  }

  // ── Get Simulation ────────────────────────────────────────────────────────

  async getSimulation(id: string): Promise<{
    run: SimulationRun;
    result: SimulationResult | null;
    assumptions: Awaited<ReturnType<SimulationRepository['findAssumptionsByRunId']>>;
  }> {
    const run = await this.repository.findSimulationRunById(id);
    if (!run) throw new NotFoundException(`Simulação ${id} não encontrada`);
    const [result, assumptions] = await Promise.all([
      this.repository.findResultByRunId(id),
      this.repository.findAssumptionsByRunId(id),
    ]);
    return { run, result, assumptions };
  }

  // ── History ───────────────────────────────────────────────────────────────

  async getHistory(patientId: string, tenantId?: string): Promise<SimulationHistory[]> {
    return this.repository.findSimulationHistory(patientId, tenantId);
  }

  // ── Compare Simulations ───────────────────────────────────────────────────

  async compareSimulations(dto: CompareSimulationsDto, userId: string) {
    const runs = await this.repository.findSimulationRunsByIds(dto.runIds);
    const results = await this.repository.findResultsByRunIds(dto.runIds);

    const resultMap = new Map(results.map((r) => [r.runId, r]));
    const runMap = new Map(runs.map((r) => [r.id, r]));

    const entries = dto.runIds
      .map((id) => {
        const run = runMap.get(id);
        const result = resultMap.get(id);
        if (!run || !result) return null;
        return buildComparisonEntry(id, {
          scenarioLabel: run.scenarioLabel,
          timeHorizonLabel: run.timeHorizon,
          baselineRiskScore: result.baselineRiskScore,
          simulatedRiskScore: result.simulatedRiskScore,
          expectedRiskVariation: result.expectedRiskVariation,
          expectedRiskVariationPercent: result.baselineRiskScore > 0
            ? parseFloat(((result.simulatedRiskScore - result.baselineRiskScore) / result.baselineRiskScore * 100).toFixed(1))
            : 0,
          confidence: result.confidence,
          baselineRiskLevel: result.baselineRiskLevel,
          simulatedRiskLevel: result.simulatedRiskLevel,
        });
      })
      .filter(Boolean) as ReturnType<typeof buildComparisonEntry>[];

    const comparison = compareSimulations(entries);

    if (runs[0]) {
      await this.audit.log('SIMULATION_COMPARED', {
        userId,
        metadata: { runIds: dto.runIds, patientId: runs[0].patientId, count: runs.length },
      });
    }

    return comparison;
  }

  // ── Scenarios ─────────────────────────────────────────────────────────────

  getScenarios() {
    return BUILT_IN_SCENARIOS.map((s) => ({
      scenarioType: s.scenarioType,
      name: s.name,
      description: s.description,
      defaultParameters: s.defaultParameters,
    }));
  }
}

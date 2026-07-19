import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service.js';
import type {
  DigitalTwin,
  SimulationRun,
  SimulationResult,
  SimulationAssumption,
  SimulationHistory,
  ScenarioTemplate,
  ScenarioType,
  TimeHorizon,
  SimulationStatus,
} from '@bio/database';

@Injectable()
export class SimulationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Digital Twin ──────────────────────────────────────────────────────────

  async upsertDigitalTwin(data: {
    patientId: string;
    tenantId?: string;
    demographics: object;
    clinicalHistory?: object;
    biomarkers?: object;
    riskFactors?: object;
    lifestyle?: object;
    longitudinalData?: object;
    activeRecommendations?: object;
    dataCompleteness: number;
    missingFields?: object;
    twinVersion?: string;
  }): Promise<DigitalTwin> {
    const payload = {
      tenantId: data.tenantId,
      twinVersion: data.twinVersion ?? '1.0',
      demographics: data.demographics,
      clinicalHistory: data.clinicalHistory,
      biomarkers: data.biomarkers,
      riskFactors: data.riskFactors,
      lifestyle: data.lifestyle,
      longitudinalData: data.longitudinalData,
      activeRecommendations: data.activeRecommendations,
      dataCompleteness: data.dataCompleteness,
      missingFields: data.missingFields,
      lastUpdated: new Date(),
    };
    return this.prisma.digitalTwin.upsert({
      where: { patientId: data.patientId },
      create: { patientId: data.patientId, ...payload },
      update: payload,
    });
  }

  async findTwinByPatientId(patientId: string): Promise<DigitalTwin | null> {
    return this.prisma.digitalTwin.findUnique({ where: { patientId } });
  }

  // ── Simulation Run ────────────────────────────────────────────────────────

  async createSimulationRun(data: {
    tenantId?: string;
    patientId: string;
    twinId: string;
    createdBy: string;
    scenarioType: ScenarioType;
    scenarioLabel: string;
    timeHorizon: TimeHorizon;
    status?: SimulationStatus;
    modelVersion?: string;
  }): Promise<SimulationRun> {
    return this.prisma.simulationRun.create({
      data: {
        tenantId: data.tenantId,
        patientId: data.patientId,
        twinId: data.twinId,
        createdBy: data.createdBy,
        scenarioType: data.scenarioType,
        scenarioLabel: data.scenarioLabel,
        timeHorizon: data.timeHorizon,
        status: data.status ?? 'COMPLETED',
        modelVersion: data.modelVersion ?? '1.0',
      },
    });
  }

  async findSimulationRunById(id: string): Promise<SimulationRun | null> {
    return this.prisma.simulationRun.findUnique({ where: { id } });
  }

  async findSimulationRunsByIds(ids: string[]): Promise<SimulationRun[]> {
    return this.prisma.simulationRun.findMany({ where: { id: { in: ids } } });
  }

  // ── Simulation Parameters ─────────────────────────────────────────────────

  async createSimulationParameters(
    runId: string,
    params: Record<string, unknown>,
  ): Promise<void> {
    const rows = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([key, val]) => ({
        runId,
        parameterKey: key,
        parameterValue: String(val),
        unit: undefined as string | undefined,
      }));
    if (rows.length > 0) {
      await this.prisma.$transaction(
        rows.map((r) => this.prisma.simulationParameters.create({ data: r })),
      );
    }
  }

  async findParametersByRunId(runId: string) {
    return this.prisma.simulationParameters.findMany({ where: { runId } });
  }

  // ── Simulation Result ─────────────────────────────────────────────────────

  async createSimulationResult(data: {
    runId: string;
    baselineRiskScore: number;
    simulatedRiskScore: number;
    expectedRiskVariation: number;
    confidence: number;
    baselineRiskLevel: string;
    simulatedRiskLevel: string;
    topFactors?: object;
  }): Promise<SimulationResult> {
    return this.prisma.simulationResult.create({
      data: {
        runId: data.runId,
        baselineRiskScore: data.baselineRiskScore,
        simulatedRiskScore: data.simulatedRiskScore,
        expectedRiskVariation: data.expectedRiskVariation,
        confidence: data.confidence,
        baselineRiskLevel: data.baselineRiskLevel,
        simulatedRiskLevel: data.simulatedRiskLevel,
        topFactors: data.topFactors,
      },
    });
  }

  async findResultByRunId(runId: string): Promise<SimulationResult | null> {
    return this.prisma.simulationResult.findUnique({ where: { runId } });
  }

  async findResultsByRunIds(runIds: string[]): Promise<SimulationResult[]> {
    return this.prisma.simulationResult.findMany({ where: { runId: { in: runIds } } });
  }

  // ── Simulation Assumptions ────────────────────────────────────────────────

  async createSimulationAssumptions(
    runId: string,
    assumptions: Array<{ category: string; description: string; impact?: string }>,
  ): Promise<SimulationAssumption[]> {
    return this.prisma.$transaction(
      assumptions.map((a) =>
        this.prisma.simulationAssumption.create({ data: { runId, category: a.category, description: a.description, impact: a.impact } }),
      ),
    );
  }

  async findAssumptionsByRunId(runId: string): Promise<SimulationAssumption[]> {
    return this.prisma.simulationAssumption.findMany({ where: { runId } });
  }

  // ── Simulation History ────────────────────────────────────────────────────

  async createSimulationHistory(data: {
    tenantId?: string;
    patientId: string;
    runId: string;
    userId: string;
    action: string;
    summary: string;
    metadata?: object;
  }): Promise<SimulationHistory> {
    return this.prisma.simulationHistory.create({ data: { ...data } });
  }

  async findSimulationHistory(patientId: string, tenantId?: string): Promise<SimulationHistory[]> {
    return this.prisma.simulationHistory.findMany({
      where: { patientId, ...(tenantId ? { tenantId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ── Scenario Templates ────────────────────────────────────────────────────

  async findScenarioTemplates(tenantId?: string): Promise<ScenarioTemplate[]> {
    return this.prisma.scenarioTemplate.findMany({
      where: { active: true, ...(tenantId ? { tenantId } : {}) },
      orderBy: { scenarioType: 'asc' },
    });
  }
}

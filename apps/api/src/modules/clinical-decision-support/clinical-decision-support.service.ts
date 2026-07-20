import { Injectable, NotFoundException } from '@nestjs/common';
import { ClinicalDecisionOrchestrator } from './services/clinical-decision-orchestrator.js';
import { ClinicalDecisionSupportProvider } from './providers/clinical-decision-support.provider.js';
import type { AnalyzeClinicalDecisionDto } from './dto/clinical-decision-support.dto.js';
import type { ClinicalDecision } from './entities/clinical-decision.entity.js';

@Injectable()
export class GaiaClinicalDecisionService {
  constructor(
    private readonly orchestrator: ClinicalDecisionOrchestrator,
    private readonly provider: ClinicalDecisionSupportProvider,
  ) {}

  async analyze(dto: AnalyzeClinicalDecisionDto): Promise<ClinicalDecision> {
    const decision = await this.orchestrator.orchestrate(dto);
    this.provider.store(decision);
    return decision;
  }

  getDecision(id: string): ClinicalDecision {
    const decision = this.provider.getById(id);
    if (!decision) throw new NotFoundException(`Clinical decision not found: ${id}`);
    return decision;
  }

  getReport(patientId: string): {
    latestDecision: ClinicalDecision;
    history: ClinicalDecision[];
    totalDecisions: number;
  } {
    const history = this.provider.getByPatient(patientId);
    if (history.length === 0) {
      throw new NotFoundException(`No clinical decisions found for patient: ${patientId}`);
    }
    return {
      latestDecision: history[0],
      history,
      totalDecisions: history.length,
    };
  }

  getDecisionsByPatient(patientId: string): ClinicalDecision[] {
    return this.provider.getByPatient(patientId);
  }
}

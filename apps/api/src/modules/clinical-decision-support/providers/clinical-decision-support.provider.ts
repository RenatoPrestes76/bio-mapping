import { Injectable } from '@nestjs/common';
import { ClinicalDecision } from '../entities/clinical-decision.entity.js';

@Injectable()
export class ClinicalDecisionSupportProvider {
  private readonly decisions = new Map<string, ClinicalDecision>();
  private readonly patientIndex = new Map<string, ClinicalDecision[]>();

  store(decision: ClinicalDecision): void {
    this.decisions.set(decision.id, decision);
    const existing = this.patientIndex.get(decision.patientId) ?? [];
    this.patientIndex.set(decision.patientId, [decision, ...existing]);
  }

  getById(id: string): ClinicalDecision | undefined {
    return this.decisions.get(id);
  }

  getByPatient(patientId: string): ClinicalDecision[] {
    return this.patientIndex.get(patientId) ?? [];
  }

  getLatestByPatient(patientId: string): ClinicalDecision | undefined {
    return this.getByPatient(patientId)[0];
  }

  count(): number {
    return this.decisions.size;
  }

  list(): ClinicalDecision[] {
    return [...this.decisions.values()];
  }
}

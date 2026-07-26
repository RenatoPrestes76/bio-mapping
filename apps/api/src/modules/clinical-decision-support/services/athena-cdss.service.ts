import { Injectable, NotFoundException } from '@nestjs/common';
import { AthenaCdssProvider } from '../providers/athena-cdss.provider.js';
import type { EvaluatePatientDto, DecisionResponseDto, AlertResponseDto } from '../dto/athena-cdss.dto.js';

@Injectable()
export class AthenaCdssService {
  constructor(private readonly provider: AthenaCdssProvider) {}

  evaluate(dto: EvaluatePatientDto): DecisionResponseDto {
    return this.provider.evaluate(dto);
  }

  getDecision(decisionId: string): DecisionResponseDto {
    const result = this.provider.getById(decisionId);
    if (!result) throw new NotFoundException(`Decision ${decisionId} not found`);
    return result;
  }

  getAlerts(patientId: string): AlertResponseDto {
    const alerts = this.provider.getAlerts(patientId);
    return {
      patientId,
      totalAlerts: alerts.length,
      criticalCount: alerts.filter((a) => a.isCritical()).length,
      activeAlerts: alerts.map((a) => a.toSummary()),
    };
  }

  getHistory(patientId: string): DecisionResponseDto[] {
    const history = this.provider.getHistory(patientId);
    if (history.length === 0) throw new NotFoundException(`No decision history for patient ${patientId}`);
    return history;
  }
}

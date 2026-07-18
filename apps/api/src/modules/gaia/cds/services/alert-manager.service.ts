import { Injectable } from '@nestjs/common';
import type { CdsAlert, CdsPriority, CdsAlertType } from '@bio/database';
import { CdsRepository } from '../repositories/cds.repository.js';

const PRIORITY_TO_ALERT_TYPE: Partial<Record<CdsPriority, CdsAlertType>> = {
  MODERATE: 'INFORMATIVE',
  HIGH: 'PREVENTIVE',
  URGENT: 'IMPORTANT',
  CRITICAL: 'CRITICAL',
};

const SLA_HOURS: Record<CdsPriority, number> = {
  LOW: 720, MODERATE: 168, HIGH: 48, URGENT: 4, CRITICAL: 1,
};

@Injectable()
export class AlertManagerService {
  constructor(private readonly repository: CdsRepository) {}

  shouldAlert(priority: CdsPriority): boolean {
    return priority !== 'LOW';
  }

  async createAlert(data: {
    patientId: string;
    evaluationId: string;
    priority: CdsPriority;
    reason: string;
    origin: string;
    tenantId?: string;
  }): Promise<CdsAlert | null> {
    if (!this.shouldAlert(data.priority)) return null;

    const alertType = PRIORITY_TO_ALERT_TYPE[data.priority] ?? 'INFORMATIVE';
    const slaHours = SLA_HOURS[data.priority];
    const expiresAt = new Date(Date.now() + slaHours * 3_600_000);

    return this.repository.createAlert({ ...data, alertType, expiresAt });
  }

  async getAlerts(patientId: string, unreadOnly?: boolean): Promise<CdsAlert[]> {
    return this.repository.findAlertsByPatient(patientId, unreadOnly);
  }

  async markRead(alertId: string): Promise<CdsAlert> {
    return this.repository.markAlertRead(alertId);
  }
}

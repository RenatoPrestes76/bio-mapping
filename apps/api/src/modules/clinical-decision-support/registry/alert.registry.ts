import type { ClinicalAlert } from '../entities/clinical-alert.entity.js';

export class AlertRegistry {
  private readonly store = new Map<string, ClinicalAlert[]>();

  register(alert: ClinicalAlert): void {
    const existing = this.store.get(alert.patientId) ?? [];
    const isDuplicate = existing.some(
      (a) => a.alertType === alert.alertType && a.title === alert.title && a.isActive(),
    );
    if (!isDuplicate) {
      this.store.set(alert.patientId, [alert, ...existing]);
    }
  }

  registerAll(alerts: ClinicalAlert[]): void {
    for (const alert of alerts) this.register(alert);
  }

  getByPatient(patientId: string): ClinicalAlert[] {
    return this.store.get(patientId) ?? [];
  }

  getActiveByPatient(patientId: string): ClinicalAlert[] {
    return this.getByPatient(patientId).filter((a) => a.isActive() && !a.isExpired());
  }

  getCriticalByPatient(patientId: string): ClinicalAlert[] {
    return this.getActiveByPatient(patientId).filter((a) => a.isCritical());
  }

  acknowledge(alertId: string): boolean {
    for (const alerts of this.store.values()) {
      const idx = alerts.findIndex((a) => a.id === alertId);
      if (idx >= 0) {
        // rebuild the alert object as acknowledged (immutable entity — rebuild)
        const orig = alerts[idx];
        const acknowledged = Object.create(
          Object.getPrototypeOf(orig),
          Object.getOwnPropertyDescriptors(orig),
        );
        Object.defineProperty(acknowledged, 'status', { value: 'ACKNOWLEDGED', writable: false });
        alerts[idx] = acknowledged;
        return true;
      }
    }
    return false;
  }

  countByPatient(patientId: string): number {
    return this.getByPatient(patientId).length;
  }

  totalCount(): number {
    return [...this.store.values()].reduce((sum, arr) => sum + arr.length, 0);
  }
}

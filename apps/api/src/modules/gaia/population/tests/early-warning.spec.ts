import { describe, it, expect } from '@jest/globals';
import {
  classifyAlertSeverity,
  checkRiskIncrease,
  checkPrevalenceGrowth,
  checkAdherenceDrop,
  checkBiomarkerChange,
  detectAlerts,
  type PopulationSnapshot,
} from '../engine/early-warning.js';

describe('early-warning', () => {
  describe('classifyAlertSeverity', () => {
    it('returns LOW for < 10%', () => expect(classifyAlertSeverity(5)).toBe('LOW'));
    it('returns MODERATE for 10-19%', () => expect(classifyAlertSeverity(15)).toBe('MODERATE'));
    it('returns HIGH for 20-29%', () => expect(classifyAlertSeverity(25)).toBe('HIGH'));
    it('returns CRITICAL for >= 30%', () => expect(classifyAlertSeverity(35)).toBe('CRITICAL'));
    it('works with negative delta', () => expect(classifyAlertSeverity(-25)).toBe('HIGH'));
  });

  describe('checkRiskIncrease', () => {
    it('returns null when delta below threshold', () => {
      expect(checkRiskIncrease(0.42, 0.40)).toBeNull();
    });

    it('returns alert when risk increases above threshold', () => {
      const alert = checkRiskIncrease(0.50, 0.40);
      expect(alert).not.toBeNull();
      expect(alert!.alertType).toBe('RISK_INCREASE');
    });

    it('metricKey is mean_risk', () => {
      expect(checkRiskIncrease(0.55, 0.40)!.metricKey).toBe('mean_risk');
    });

    it('currentValue and previousValue are set', () => {
      const alert = checkRiskIncrease(0.55, 0.40)!;
      expect(alert.currentValue).toBe(0.55);
      expect(alert.previousValue).toBe(0.40);
    });
  });

  describe('checkPrevalenceGrowth', () => {
    it('returns null when delta below threshold', () => {
      expect(checkPrevalenceGrowth('diabetes', 12.0, 11.96)).toBeNull();
    });

    it('returns DISEASE_GROWTH alert on significant increase', () => {
      const alert = checkPrevalenceGrowth('diabetes', 15.0, 10.0);
      expect(alert!.alertType).toBe('DISEASE_GROWTH');
    });

    it('title includes condition name', () => {
      expect(checkPrevalenceGrowth('hypertension', 20, 10)!.title).toContain('hypertension');
    });
  });

  describe('checkAdherenceDrop', () => {
    it('returns null when drop below threshold', () => {
      expect(checkAdherenceDrop(0.85, 0.87)).toBeNull();
    });

    it('returns ADHERENCE_DROP alert on significant drop', () => {
      const alert = checkAdherenceDrop(0.60, 0.80);
      expect(alert!.alertType).toBe('ADHERENCE_DROP');
    });

    it('returns null when adherence improves', () => {
      expect(checkAdherenceDrop(0.90, 0.80)).toBeNull();
    });
  });

  describe('checkBiomarkerChange', () => {
    it('returns null for zero previous value', () => {
      expect(checkBiomarkerChange('glucose', 100, 0)).toBeNull();
    });

    it('returns null when change below threshold', () => {
      expect(checkBiomarkerChange('glucose', 102, 100, 0.10)).toBeNull();
    });

    it('returns BIOMARKER_CHANGE on significant change', () => {
      const alert = checkBiomarkerChange('glucose', 130, 100, 0.10);
      expect(alert!.alertType).toBe('BIOMARKER_CHANGE');
    });
  });

  describe('detectAlerts', () => {
    const current: PopulationSnapshot = {
      meanRisk: 0.55,
      prevalences: { diabetes: 15.0 },
      adherenceRate: 0.60,
    };
    const previous: PopulationSnapshot = {
      meanRisk: 0.40,
      prevalences: { diabetes: 10.0 },
      adherenceRate: 0.80,
    };

    it('returns array of alerts', () => {
      const alerts = detectAlerts(current, previous);
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('detects risk increase', () => {
      const alerts = detectAlerts(current, previous);
      expect(alerts.some((a) => a.alertType === 'RISK_INCREASE')).toBe(true);
    });

    it('detects prevalence growth', () => {
      const alerts = detectAlerts(current, previous);
      expect(alerts.some((a) => a.alertType === 'DISEASE_GROWTH')).toBe(true);
    });

    it('detects adherence drop', () => {
      const alerts = detectAlerts(current, previous);
      expect(alerts.some((a) => a.alertType === 'ADHERENCE_DROP')).toBe(true);
    });

    it('alerts are sorted by severity (CRITICAL first)', () => {
      const alerts = detectAlerts(current, previous);
      const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
      for (let i = 1; i < alerts.length; i++) {
        expect(order[alerts[i - 1].severity]).toBeLessThanOrEqual(order[alerts[i].severity]);
      }
    });

    it('returns empty when no changes warrant alerts', () => {
      const same: PopulationSnapshot = { meanRisk: 0.40, prevalences: { diabetes: 10 }, adherenceRate: 0.80 };
      expect(detectAlerts(same, same)).toHaveLength(0);
    });
  });
});

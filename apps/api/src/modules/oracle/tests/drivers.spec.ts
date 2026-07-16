import { SimulatorDriver } from '../drivers/simulator.driver';
import { AppleHealthDriver } from '../drivers/apple-health.driver';
import { OracleMetricType, HealthPlatform } from '@bio/database';

describe('Platform Drivers', () => {
  // ── SimulatorDriver (no network calls) ───────────────────────────────────────

  describe('SimulatorDriver', () => {
    let driver: SimulatorDriver;

    beforeEach(() => {
      driver = new SimulatorDriver();
    });

    it('platform is SIMULATOR', () => {
      expect(driver.platform).toBe(HealthPlatform.SIMULATOR);
    });

    it('getAuthUrl contains patient id', () => {
      const url = driver.getAuthUrl('patient-1', 'http://localhost/cb');
      expect(url).toContain('patient-1');
    });

    it('exchangeCode returns static token', async () => {
      const tokens = await driver.exchangeCode('any-code', 'http://localhost/cb');
      expect(tokens.accessToken).toBe('simulator-static-token');
      expect(tokens.scopes).toContain('all');
    });

    it('refreshTokens returns static simulator token', async () => {
      const tokens = await driver.refreshTokens('any-token');
      expect(tokens.accessToken).toBe('simulator-static-token');
    });

    it('fetchData returns 6 metrics per day', async () => {
      const since = new Date('2025-01-01');
      const until = new Date('2025-01-03'); // 3 days inclusive
      const records = await driver.fetchData('token', since, until);
      // 3 days × 6 metrics = 18 records
      expect(records.length).toBe(18);
    });

    it('fetchData covers all expected metric types', async () => {
      const since = new Date('2025-01-01');
      const until = new Date('2025-01-01');
      const records = await driver.fetchData('token', since, until);
      const types = new Set(records.map((r) => r.metricType));
      expect(types.has(OracleMetricType.HEART_RATE)).toBe(true);
      expect(types.has(OracleMetricType.STEPS)).toBe(true);
      expect(types.has(OracleMetricType.SLEEP)).toBe(true);
      expect(types.has(OracleMetricType.CALORIES)).toBe(true);
      expect(types.has(OracleMetricType.SPO2)).toBe(true);
      expect(types.has(OracleMetricType.HRV)).toBe(true);
    });

    it('heart rate stays within realistic range', async () => {
      const since = new Date('2025-01-01');
      const until = new Date('2025-01-07');
      const records = await driver.fetchData('token', since, until);
      const hrRecords = records.filter((r) => r.metricType === OracleMetricType.HEART_RATE);
      for (const r of hrRecords) {
        expect(r.value).toBeGreaterThan(40);
        expect(r.value).toBeLessThan(100);
        expect(r.unit).toBe('bpm');
      }
    });

    it('revokeAccess resolves without error', async () => {
      await expect(driver.revokeAccess('any')).resolves.toBeUndefined();
    });
  });

  // ── Driver interface stubs (no network) ──────────────────────────────────────

  describe('Apple Health Driver', () => {
    it('uses HealthKit auth URL scheme', () => {
      const d = new AppleHealthDriver();
      expect(d.platform).toBe(HealthPlatform.APPLE_HEALTH);
      const url = d.getAuthUrl('p1', 'http://localhost/cb');
      expect(url).toContain('healthkit');
    });
  });
});

import { SmartScaleDriver } from '../drivers/scales/smart-scale.driver';
import { BloodPressureDriver } from '../drivers/blood-pressure/blood-pressure.driver';
import { PulseOximeterDriver } from '../drivers/pulse-oximeter/pulse-oximeter.driver';
import { HeartRateDriver } from '../drivers/heart-rate/heart-rate.driver';
import { GlucometerDriver } from '../drivers/glucometer/glucometer.driver';
import { MockDriver } from '../drivers/mock/mock.driver';
import { DeviceCapability, MeasurementType } from '../drivers/base/device-capability';

// ── SmartScaleDriver ──────────────────────────────────────────────────────────

describe('SmartScaleDriver', () => {
  let driver: SmartScaleDriver;
  beforeEach(() => { driver = new SmartScaleDriver(); });

  it('driverName is smart-scale', () => expect(driver.driverName).toBe('smart-scale'));
  it('supports BLE and WIFI', () => {
    expect(driver.supportedConnectionTypes).toContain('BLE');
    expect(driver.supportedConnectionTypes).toContain('WIFI');
  });
  it('capabilities include WEIGHT, BMI, BODY_FAT', () => {
    const caps = driver.getCapabilities();
    expect(caps).toContain(DeviceCapability.WEIGHT);
    expect(caps).toContain(DeviceCapability.BMI);
    expect(caps).toContain(DeviceCapability.BODY_FAT);
  });
  it('takeMeasurement returns BODY_COMP with weight and bodyFat', async () => {
    const m = await driver.takeMeasurement('dev-1');
    expect(m.measurementType).toBe(MeasurementType.BODY_COMP);
    expect(typeof m.rawData['weight']).toBe('number');
    expect(typeof m.rawData['bodyFat']).toBe('number');
  });
});

// ── BloodPressureDriver ───────────────────────────────────────────────────────

describe('BloodPressureDriver', () => {
  let driver: BloodPressureDriver;
  beforeEach(() => { driver = new BloodPressureDriver(); });

  it('driverName is blood-pressure-monitor', () => expect(driver.driverName).toBe('blood-pressure-monitor'));
  it('capabilities include BLOOD_PRESSURE and HEART_RATE', () => {
    const caps = driver.getCapabilities();
    expect(caps).toContain(DeviceCapability.BLOOD_PRESSURE);
    expect(caps).toContain(DeviceCapability.HEART_RATE);
  });
  it('takeMeasurement returns systolic/diastolic/pulse', async () => {
    const m = await driver.takeMeasurement('dev-1');
    expect(m.measurementType).toBe(MeasurementType.BLOOD_PRESSURE);
    expect(typeof m.rawData['systolic']).toBe('number');
    expect(typeof m.rawData['diastolic']).toBe('number');
    expect(typeof m.rawData['pulse']).toBe('number');
  });
  it('unit is mmHg', async () => {
    const m = await driver.takeMeasurement('dev-1');
    expect(m.unit).toBe('mmHg');
  });
});

// ── PulseOximeterDriver ───────────────────────────────────────────────────────

describe('PulseOximeterDriver', () => {
  let driver: PulseOximeterDriver;
  beforeEach(() => { driver = new PulseOximeterDriver(); });

  it('driverName is pulse-oximeter', () => expect(driver.driverName).toBe('pulse-oximeter'));
  it('capabilities include OXYGEN_SATURATION', () => {
    expect(driver.getCapabilities()).toContain(DeviceCapability.OXYGEN_SATURATION);
  });
  it('takeMeasurement returns spo2 and heartRate', async () => {
    const m = await driver.takeMeasurement('dev-1');
    expect(m.measurementType).toBe(MeasurementType.PULSE_OX);
    expect(typeof m.rawData['spo2']).toBe('number');
    expect(typeof m.rawData['heartRate']).toBe('number');
  });
  it('unit is %', async () => {
    const m = await driver.takeMeasurement('dev-1');
    expect(m.unit).toBe('%');
  });
});

// ── HeartRateDriver ───────────────────────────────────────────────────────────

describe('HeartRateDriver', () => {
  let driver: HeartRateDriver;
  beforeEach(() => { driver = new HeartRateDriver(); });

  it('driverName is heart-rate-monitor', () => expect(driver.driverName).toBe('heart-rate-monitor'));
  it('takeMeasurement returns instantHeartRate', async () => {
    const m = await driver.takeMeasurement('dev-1');
    expect(m.measurementType).toBe(MeasurementType.HEART_RATE);
    expect(typeof m.rawData['instantHeartRate']).toBe('number');
  });
  it('accumulates session peaks — avgHeartRate grows', async () => {
    await driver.connect('dev-1');
    const m1 = await driver.takeMeasurement('dev-1');
    const m2 = await driver.takeMeasurement('dev-1');
    expect(m1.rawData['avgHeartRate']).toBe(m1.rawData['instantHeartRate']);
    expect(typeof m2.rawData['maxHeartRate']).toBe('number');
  });
  it('clears session peaks on disconnect', async () => {
    await driver.connect('dev-1');
    await driver.takeMeasurement('dev-1');
    await driver.disconnect('dev-1');
    const m = await driver.takeMeasurement('dev-1');
    expect(m.rawData['avgHeartRate']).toBe(m.rawData['instantHeartRate']);
  });
});

// ── GlucometerDriver ──────────────────────────────────────────────────────────

describe('GlucometerDriver', () => {
  let driver: GlucometerDriver;
  beforeEach(() => { driver = new GlucometerDriver(); });

  it('driverName is glucometer', () => expect(driver.driverName).toBe('glucometer'));
  it('supports BLE and USB', () => {
    expect(driver.supportedConnectionTypes).toContain('BLE');
    expect(driver.supportedConnectionTypes).toContain('USB');
  });
  it('takeMeasurement returns glucose and mealTag', async () => {
    const m = await driver.takeMeasurement('dev-1');
    expect(m.measurementType).toBe(MeasurementType.BLOOD_GLUCOSE);
    expect(typeof m.rawData['glucose']).toBe('number');
    expect(typeof m.rawData['mealTag']).toBe('string');
  });
  it('unit is mg/dL', async () => {
    const m = await driver.takeMeasurement('dev-1');
    expect(m.unit).toBe('mg/dL');
  });
});

// ── MockDriver ────────────────────────────────────────────────────────────────

describe('MockDriver', () => {
  let driver: MockDriver;
  beforeEach(() => { driver = new MockDriver(); });

  it('driverName is mock-driver', () => expect(driver.driverName).toBe('mock-driver'));
  it('supports all connection types', () => {
    expect(driver.supportedConnectionTypes).toContain('BLE');
    expect(driver.supportedConnectionTypes).toContain('API');
  });
  it('capabilities include all DeviceCapability values', () => {
    const all = Object.values(DeviceCapability);
    const caps = driver.getCapabilities();
    for (const cap of all) {
      expect(caps).toContain(cap);
    }
  });
  it('takeMeasurement returns GENERIC type with simulated=true', async () => {
    const m = await driver.takeMeasurement('dev-1');
    expect(m.measurementType).toBe(MeasurementType.GENERIC);
    expect(m.rawData['simulated']).toBe(true);
  });
});

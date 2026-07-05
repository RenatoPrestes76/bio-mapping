import { BaseDeviceDriver } from '../drivers/base/base-device-driver';
import { DeviceCapability, MeasurementType } from '../drivers/base/device-capability';

class TestDriver extends BaseDeviceDriver {
  readonly driverName = 'test-driver';
  readonly supportedConnectionTypes = ['BLE'];
  protected get measurementType() { return MeasurementType.GENERIC; }
  protected get defaultUnit() { return 'unit'; }
  getCapabilities(): DeviceCapability[] { return [DeviceCapability.WEIGHT]; }
  protected simulateMeasurement(_id: string) { return { value: 42 }; }
}

describe('BaseDeviceDriver', () => {
  let driver: TestDriver;

  beforeEach(() => { driver = new TestDriver(); });

  describe('connect / disconnect / isConnected', () => {
    it('starts disconnected', () => {
      expect(driver.isConnected('dev-1')).toBe(false);
    });

    it('isConnected true after connect', async () => {
      await driver.connect('dev-1');
      expect(driver.isConnected('dev-1')).toBe(true);
    });

    it('isConnected false after disconnect', async () => {
      await driver.connect('dev-1');
      await driver.disconnect('dev-1');
      expect(driver.isConnected('dev-1')).toBe(false);
    });

    it('connect/disconnect do not affect other deviceIds', async () => {
      await driver.connect('dev-1');
      expect(driver.isConnected('dev-2')).toBe(false);
    });
  });

  describe('read', () => {
    it('returns DeviceReadResult with correct characteristic', async () => {
      const result = await driver.read('dev-1', 'char-001');
      expect(result.characteristic).toBe('char-001');
      expect(result.data).toBeInstanceOf(Buffer);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('write / subscribe / unsubscribe', () => {
    it('write resolves without error', async () => {
      await expect(driver.write('dev-1', 'char-001', Buffer.alloc(4))).resolves.toBeUndefined();
    });

    it('subscribe resolves without error', async () => {
      await expect(driver.subscribe('dev-1', 'char-001', jest.fn())).resolves.toBeUndefined();
    });

    it('unsubscribe resolves without error', async () => {
      await expect(driver.unsubscribe('dev-1', 'char-001')).resolves.toBeUndefined();
    });
  });

  describe('takeMeasurement', () => {
    it('returns RawMeasurement with correct shape', async () => {
      const result = await driver.takeMeasurement('dev-1');
      expect(result.deviceId).toBe('dev-1');
      expect(result.driverName).toBe('test-driver');
      expect(result.measurementType).toBe(MeasurementType.GENERIC);
      expect(result.rawData).toEqual({ value: 42 });
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('getDeviceInfo', () => {
    it('returns driver info with capabilities', async () => {
      const info = await driver.getDeviceInfo('dev-1');
      expect(info.driverName).toBe('test-driver');
      expect(info.capabilities).toContain(DeviceCapability.WEIGHT);
      expect(info.connectionTypes).toContain('BLE');
    });
  });

  describe('calibrate', () => {
    it('returns success with notes and referenceValues', async () => {
      const result = await driver.calibrate('dev-1', { notes: 'bench test', referenceValues: { offset: 0.1 } });
      expect(result.success).toBe(true);
      expect(result.notes).toBe('bench test');
      expect(result.referenceValues).toEqual({ offset: 0.1 });
    });

    it('returns success without options', async () => {
      const result = await driver.calibrate('dev-1');
      expect(result.success).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('healthy=false when not connected', async () => {
      const result = await driver.healthCheck('dev-1');
      expect(result.healthy).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('healthy=true when connected', async () => {
      await driver.connect('dev-1');
      const result = await driver.healthCheck('dev-1');
      expect(result.healthy).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

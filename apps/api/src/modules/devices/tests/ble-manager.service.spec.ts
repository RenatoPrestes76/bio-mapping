import { BleManagerService } from '../ble/ble-manager.service';
import { DeviceEventBusService } from '../events/device-event-bus.service';
import { DeviceEventType } from '../events/device-events';

function makeEventBus(): jest.Mocked<DeviceEventBusService> {
  return { emit: jest.fn(), on: jest.fn(), once: jest.fn(), off: jest.fn(), listenerCount: jest.fn(), removeAllListeners: jest.fn() } as any;
}

function makeInfo(mac = 'AA:BB:CC') {
  return { macAddress: mac, name: 'TestDevice', rssi: -60, manufacturer: 'Acme', connectionType: 'BLE', discoveredAt: new Date() };
}

describe('BleManagerService', () => {
  let service: BleManagerService;
  let eventBus: jest.Mocked<DeviceEventBusService>;

  beforeEach(() => {
    eventBus = makeEventBus();
    service = new BleManagerService(eventBus);
  });

  // ── Scan lifecycle ──────────────────────────────────────────────────────────

  describe('startScan', () => {
    it('inicia scan e retorna scanning=true', () => {
      const result = service.startScan();
      expect(result.scanning).toBe(true);
      expect(result.startedAt).toBeInstanceOf(Date);
      expect(service.isScanning).toBe(true);
    });

    it('retorna estado atual se já estiver em scan', () => {
      service.startScan();
      const r2 = service.startScan();
      expect(r2.scanning).toBe(true);
    });

    it('limpa cache de descobertos ao iniciar novo scan', () => {
      service.reportDiscovered(makeInfo());
      service.startScan();
      expect(service.getAvailableDevices()).toHaveLength(0);
    });
  });

  describe('stopScan', () => {
    it('para scan e retorna discoveredCount', () => {
      service.startScan();
      service.reportDiscovered(makeInfo('A1'));
      service.reportDiscovered(makeInfo('A2'));
      const result = service.stopScan();
      expect(result.scanning).toBe(false);
      expect(result.discoveredCount).toBe(2);
      expect(service.isScanning).toBe(false);
    });
  });

  // ── Discovery cache ─────────────────────────────────────────────────────────

  describe('reportDiscovered', () => {
    it('adiciona dispositivo ao cache', () => {
      service.reportDiscovered(makeInfo('AA:BB'));
      expect(service.getAvailableDevices()).toHaveLength(1);
    });

    it('emite evento DEVICE_DISCOVERED', () => {
      service.reportDiscovered(makeInfo('AA:BB'));
      expect(eventBus.emit).toHaveBeenCalledWith(
        DeviceEventType.DEVICE_DISCOVERED,
        expect.objectContaining({ macAddress: 'AA:BB', connectionType: 'BLE' }),
      );
    });

    it('atualiza entrada existente (upsert por macAddress)', () => {
      service.reportDiscovered(makeInfo('AA:BB'));
      service.reportDiscovered({ ...makeInfo('AA:BB'), name: 'Updated' });
      const devices = service.getAvailableDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].name).toBe('Updated');
    });
  });

  describe('reportLost', () => {
    it('remove do cache e emite DEVICE_LOST', () => {
      service.reportDiscovered(makeInfo('AA:BB'));
      service.reportLost('AA:BB', 'dev-1');
      expect(service.getAvailableDevices()).toHaveLength(0);
      expect(eventBus.emit).toHaveBeenCalledWith(
        DeviceEventType.DEVICE_LOST,
        expect.objectContaining({ macAddress: 'AA:BB', deviceId: 'dev-1' }),
      );
    });
  });

  describe('clearDiscoveryCache', () => {
    it('esvazia o cache', () => {
      service.reportDiscovered(makeInfo());
      service.clearDiscoveryCache();
      expect(service.getAvailableDevices()).toHaveLength(0);
    });
  });

  // ── Connection management ───────────────────────────────────────────────────

  describe('connect', () => {
    it('adiciona à lista de conectados e emite DEVICE_CONNECTED', () => {
      service.connect('dev-1', 'ses-1');
      expect(service.isConnected('dev-1')).toBe(true);
      expect(service.getConnectedDevices()).toContain('dev-1');
      expect(eventBus.emit).toHaveBeenCalledWith(
        DeviceEventType.DEVICE_CONNECTED,
        expect.objectContaining({ deviceId: 'dev-1', sessionId: 'ses-1' }),
      );
    });
  });

  describe('disconnect', () => {
    it('remove da lista e emite DEVICE_DISCONNECTED', () => {
      service.connect('dev-1', 'ses-1');
      service.disconnect('dev-1', 'ses-1', 'user requested');
      expect(service.isConnected('dev-1')).toBe(false);
      expect(eventBus.emit).toHaveBeenCalledWith(
        DeviceEventType.DEVICE_DISCONNECTED,
        expect.objectContaining({ deviceId: 'dev-1', reason: 'user requested' }),
      );
    });

    it('funciona sem sessionId e sem reason', () => {
      service.connect('dev-2', 'ses-2');
      service.disconnect('dev-2');
      expect(service.isConnected('dev-2')).toBe(false);
    });
  });

  describe('reportBatteryChange', () => {
    it('emite DEVICE_BATTERY_CHANGED com nível correto', () => {
      service.reportBatteryChange('dev-1', 75);
      expect(eventBus.emit).toHaveBeenCalledWith(
        DeviceEventType.DEVICE_BATTERY_CHANGED,
        expect.objectContaining({ deviceId: 'dev-1', batteryLevel: 75 }),
      );
    });
  });

  describe('reportError', () => {
    it('emite DEVICE_ERROR com mensagem de erro', () => {
      service.reportError('dev-1', 'connection timeout');
      expect(eventBus.emit).toHaveBeenCalledWith(
        DeviceEventType.DEVICE_ERROR,
        expect.objectContaining({ deviceId: 'dev-1', error: 'connection timeout' }),
      );
    });
  });

  // ── getScanStatus ───────────────────────────────────────────────────────────

  describe('getScanStatus', () => {
    it('retorna estado inicial', () => {
      const status = service.getScanStatus();
      expect(status.scanning).toBe(false);
      expect(status.startedAt).toBeNull();
      expect(status.discoveredCount).toBe(0);
      expect(status.connectedCount).toBe(0);
    });

    it('reflete estado após scan e conexões', () => {
      service.startScan();
      service.reportDiscovered(makeInfo());
      service.connect('dev-1', 'ses-1');
      const status = service.getScanStatus();
      expect(status.scanning).toBe(true);
      expect(status.discoveredCount).toBe(1);
      expect(status.connectedCount).toBe(1);
    });
  });
});

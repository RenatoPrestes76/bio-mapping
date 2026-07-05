import { DiscoveryService } from '../discovery/services/discovery.service';
import { BleManagerService } from '../ble/ble-manager.service';
import { rssiToSignalStrength } from '../discovery/dto/discovered-device.dto';

function makeBle(): jest.Mocked<BleManagerService> {
  return {
    startScan: jest.fn().mockReturnValue({ scanning: true, startedAt: new Date() }),
    stopScan: jest.fn().mockReturnValue({ scanning: false, discoveredCount: 0 }),
    reportDiscovered: jest.fn(),
    getAvailableDevices: jest.fn().mockReturnValue([]),
    getScanStatus: jest.fn().mockReturnValue({ scanning: false, startedAt: null, discoveredCount: 0, connectedCount: 0 }),
    isConnected: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    reportLost: jest.fn(),
    reportBatteryChange: jest.fn(),
    reportError: jest.fn(),
    getConnectedDevices: jest.fn(),
    clearDiscoveryCache: jest.fn(),
  } as any;
}

const ADMIN = { sub: 'user-1', role: 'ADMIN' };
const PROFESSIONAL = { sub: 'user-2', role: 'PROFESSIONAL' };

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let ble: jest.Mocked<BleManagerService>;

  beforeEach(() => {
    ble = makeBle();
    service = new DiscoveryService({} as any, ble);
  });

  // ── startScan ───────────────────────────────────────────────────────────────

  describe('startScan', () => {
    it('chama ble.startScan e retorna mensagem', () => {
      const result = service.startScan(ADMIN);
      expect(ble.startScan).toHaveBeenCalled();
      expect(result.message).toBe('Scan iniciado');
      expect(result.scanning).toBe(true);
    });

    it('retorna "já estava ativo" se scanning já true (retorno do ble)', () => {
      ble.startScan.mockReturnValue({ scanning: true, startedAt: new Date() });
      const result = service.startScan(ADMIN);
      expect(result.message).toBe('Scan iniciado');
    });
  });

  // ── stopScan ────────────────────────────────────────────────────────────────

  describe('stopScan', () => {
    it('chama ble.stopScan e retorna mensagem', () => {
      ble.stopScan.mockReturnValue({ scanning: false, discoveredCount: 3 });
      const result = service.stopScan(PROFESSIONAL);
      expect(ble.stopScan).toHaveBeenCalled();
      expect(result.scanning).toBe(false);
      expect(result.discoveredCount).toBe(3);
      expect(result.message).toBe('Scan encerrado');
    });
  });

  // ── reportDevice ────────────────────────────────────────────────────────────

  describe('reportDevice', () => {
    it('chama ble.reportDiscovered e retorna DiscoveredDeviceResponseDto', () => {
      const dto = { macAddress: 'AA:BB:CC', name: 'BLE-Dev', rssi: -55, connectionType: 'BLE' };
      const result = service.reportDevice(dto);
      expect(ble.reportDiscovered).toHaveBeenCalledWith(expect.objectContaining({ macAddress: 'AA:BB:CC' }));
      expect(result.macAddress).toBe('AA:BB:CC');
      expect(result.signalStrength).toBe('GOOD');
    });

    it('usa BLE como connectionType padrão', () => {
      service.reportDevice({ macAddress: 'AA', name: 'Dev' });
      expect(ble.reportDiscovered).toHaveBeenCalledWith(expect.objectContaining({ connectionType: 'BLE' }));
    });
  });

  // ── getDiscovered ────────────────────────────────────────────────────────────

  describe('getDiscovered', () => {
    it('mapeia dispositivos do cache BLE para DiscoveredDeviceResponseDto', () => {
      ble.getAvailableDevices.mockReturnValue([
        { macAddress: 'A1', name: 'Dev-1', rssi: -70, connectionType: 'BLE', discoveredAt: new Date() },
        { macAddress: 'A2', name: 'Dev-2', rssi: -45, connectionType: 'BLE', discoveredAt: new Date() },
      ]);
      const result = service.getDiscovered();
      expect(result).toHaveLength(2);
      expect(result[0].signalStrength).toBe('FAIR');
      expect(result[1].signalStrength).toBe('EXCELLENT');
    });

    it('retorna [] quando cache vazio', () => {
      expect(service.getDiscovered()).toHaveLength(0);
    });
  });

  // ── getScanStatus ────────────────────────────────────────────────────────────

  describe('getScanStatus', () => {
    it('delega para ble.getScanStatus', () => {
      const status = { scanning: true, startedAt: new Date(), discoveredCount: 5, connectedCount: 2 };
      ble.getScanStatus.mockReturnValue(status);
      expect(service.getScanStatus()).toEqual(status);
    });
  });
});

// ── rssiToSignalStrength ──────────────────────────────────────────────────────

describe('rssiToSignalStrength', () => {
  it('EXCELLENT quando rssi >= -50', () => {
    expect(rssiToSignalStrength(-50)).toBe('EXCELLENT');
    expect(rssiToSignalStrength(-30)).toBe('EXCELLENT');
  });

  it('GOOD quando -65 <= rssi < -50', () => {
    expect(rssiToSignalStrength(-65)).toBe('GOOD');
    expect(rssiToSignalStrength(-60)).toBe('GOOD');
  });

  it('FAIR quando -80 <= rssi < -65', () => {
    expect(rssiToSignalStrength(-80)).toBe('FAIR');
    expect(rssiToSignalStrength(-75)).toBe('FAIR');
  });

  it('POOR quando rssi < -80 ou undefined', () => {
    expect(rssiToSignalStrength(-90)).toBe('POOR');
    expect(rssiToSignalStrength(undefined)).toBe('POOR');
    expect(rssiToSignalStrength(null as any)).toBe('POOR');
  });
});

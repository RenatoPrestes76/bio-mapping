import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RegistryService } from '../registry/services/registry.service';
import { DeviceStatus, ConnectionType } from '@bio/database';

const CTX = { ip: '127.0.0.1', userAgent: 'test' };
const ADMIN = { sub: 'admin-1', role: 'ADMIN' };
const PROFESSIONAL = { sub: 'prof-1', role: 'PROFESSIONAL' };
const PATIENT = { sub: 'pat-1', role: 'PATIENT' };

function makeDevice(overrides: any = {}) {
  return {
    id: 'dev-1',
    name: 'TestDevice',
    manufacturer: null,
    model: null,
    serialNumber: null,
    firmwareVersion: null,
    connectionType: ConnectionType.BLE,
    status: DeviceStatus.DISCOVERED,
    lastSeen: null,
    batteryLevel: null,
    macAddress: null,
    rssi: null,
    signalStrength: null,
    organizationId: null,
    patientId: null,
    pairedBy: null,
    pairedAt: null,
    totalConnections: 0,
    totalReconnections: 0,
    totalErrors: 0,
    avgSignalQuality: null,
    avgLatencyMs: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makePrisma() {
  return {
    device: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    patient: { findFirst: jest.fn() },
    deviceSession: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
}

function makeBle(): any {
  return { isConnected: jest.fn().mockReturnValue(false), disconnect: jest.fn() };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

describe('RegistryService', () => {
  let service: RegistryService;
  let prisma: ReturnType<typeof makePrisma>;
  let ble: ReturnType<typeof makeBle>;
  let audit: ReturnType<typeof makeAudit>;

  beforeEach(() => {
    prisma = makePrisma();
    ble = makeBle();
    audit = makeAudit();
    service = new RegistryService(prisma as any, audit as any, ble as any);
  });

  // ── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('registra dispositivo e retorna DeviceResponseDto', async () => {
      const device = makeDevice();
      prisma.device.create.mockResolvedValue(device);

      const result = await service.register({ name: 'TestDevice' } as any, ADMIN, CTX);

      expect(prisma.device.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'TestDevice', status: DeviceStatus.DISCOVERED }),
      });
      expect(audit.log).toHaveBeenCalledWith('DEVICE_REGISTERED', expect.anything());
      expect(result.id).toBe('dev-1');
    });

    it('PATIENT lança ForbiddenException', async () => {
      await expect(service.register({ name: 'Dev' } as any, PATIENT, CTX)).rejects.toThrow(ForbiddenException);
    });

    it('usa connectionType do dto quando fornecido', async () => {
      prisma.device.create.mockResolvedValue(makeDevice({ connectionType: ConnectionType.USB }));
      await service.register({ name: 'Dev', connectionType: 'USB' } as any, ADMIN, CTX);
      expect(prisma.device.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ connectionType: ConnectionType.USB }),
      });
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna lista paginada', async () => {
      const devices = [makeDevice(), makeDevice({ id: 'dev-2' })];
      prisma.$transaction.mockResolvedValue([devices, 2]);

      const result = await service.findAll({} as any, ADMIN);

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('PATIENT restringe por patientId', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll({} as any, PATIENT);

      expect(prisma.patient.findFirst).toHaveBeenCalledWith({ where: { userId: PATIENT.sub, deletedAt: null } });
    });

    it('PATIENT sem registro usa patientId=none', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll({} as any, PATIENT);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('aplica filtros de status e connectionType', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll({ status: 'PAIRED', connectionType: 'BLE' } as any, ADMIN);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna dispositivo para ADMIN', async () => {
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      const result = await service.findOne('dev-1', ADMIN);
      expect(result.id).toBe('dev-1');
    });

    it('PATIENT com acesso correto retorna dispositivo', async () => {
      prisma.device.findFirst.mockResolvedValue(makeDevice({ patientId: 'patient-1' }));
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      const result = await service.findOne('dev-1', PATIENT);
      expect(result.id).toBe('dev-1');
    });

    it('PATIENT sem acesso lança ForbiddenException', async () => {
      prisma.device.findFirst.mockResolvedValue(makeDevice({ patientId: 'patient-2' }));
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      await expect(service.findOne('dev-1', PATIENT)).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException se não existe', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      await expect(service.findOne('ghost', ADMIN)).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('atualiza dispositivo e retorna DeviceResponseDto', async () => {
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      prisma.device.update.mockResolvedValue(makeDevice({ name: 'Updated' }));

      const result = await service.update('dev-1', { name: 'Updated' } as any, ADMIN, CTX);

      expect(prisma.device.update).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith('DEVICE_UPDATED', expect.anything());
      expect(result.name).toBe('Updated');
    });

    it('PATIENT lança ForbiddenException', async () => {
      await expect(service.update('dev-1', {} as any, PATIENT, CTX)).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException se não existe', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      await expect(service.update('ghost', {} as any, ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('soft-deleta dispositivo e registra auditoria', async () => {
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      prisma.device.update.mockResolvedValue(makeDevice());

      await service.remove('dev-1', ADMIN, CTX);

      expect(prisma.device.update).toHaveBeenCalledWith({
        where: { id: 'dev-1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date), status: DeviceStatus.DISCONNECTED }),
      });
      expect(audit.log).toHaveBeenCalledWith('DEVICE_DELETED', expect.anything());
    });

    it('desconecta via BLE se dispositivo estiver conectado', async () => {
      ble.isConnected.mockReturnValue(true);
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      prisma.device.update.mockResolvedValue(makeDevice());

      await service.remove('dev-1', ADMIN, CTX);

      expect(ble.disconnect).toHaveBeenCalledWith('dev-1', undefined, 'device deleted');
    });

    it('PATIENT lança ForbiddenException', async () => {
      await expect(service.remove('dev-1', PATIENT, CTX)).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException se não existe', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      await expect(service.remove('ghost', ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });
  });

  // ── getStatistics ─────────────────────────────────────────────────────────────

  describe('getStatistics', () => {
    it('retorna estatísticas agregadas', async () => {
      const devices = [
        makeDevice({ status: 'CONNECTED', batteryLevel: 80 }),
        makeDevice({ id: 'dev-2', status: 'PAIRED', batteryLevel: 60 }),
        makeDevice({ id: 'dev-3', status: 'DISCONNECTED', batteryLevel: null }),
      ];
      prisma.device.findMany.mockResolvedValue(devices);
      prisma.deviceSession.findFirst.mockResolvedValue({ startedAt: new Date() });

      const result = await service.getStatistics(ADMIN);

      expect(result.totalDevices).toBe(3);
      expect(result.connectedDevices).toBe(1);
      expect(result.pairedDevices).toBe(1);
      expect(result.offlineDevices).toBe(1);
      expect(result.devicesWithBattery).toBe(2);
      expect(result.avgBatteryLevel).toBe(70);
      expect(result.lastSync).toBeInstanceOf(Date);
    });

    it('avgBatteryLevel é null quando nenhum dispositivo tem bateria', async () => {
      prisma.device.findMany.mockResolvedValue([makeDevice({ batteryLevel: null })]);
      prisma.deviceSession.findFirst.mockResolvedValue(null);

      const result = await service.getStatistics(ADMIN);

      expect(result.avgBatteryLevel).toBeNull();
      expect(result.lastSync).toBeNull();
    });

    it('PATIENT filtra por patientId', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.device.findMany.mockResolvedValue([]);
      prisma.deviceSession.findFirst.mockResolvedValue(null);

      await service.getStatistics(PATIENT);

      expect(prisma.patient.findFirst).toHaveBeenCalled();
    });
  });
});

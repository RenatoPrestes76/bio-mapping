import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PairingService } from '../pairing/services/pairing.service';
import { DeviceStatus } from '@bio/database';

const CTX = { ip: '127.0.0.1', userAgent: 'test' };
const ADMIN = { sub: 'admin-1', role: 'ADMIN' };
const PROFESSIONAL = { sub: 'prof-1', role: 'PROFESSIONAL' };
const DOCTOR = { sub: 'doc-1', role: 'DOCTOR' };
const PATIENT = { sub: 'pat-1', role: 'PATIENT' };

function makeDevice(overrides: any = {}) {
  return {
    id: 'dev-1',
    name: 'TestDevice',
    status: DeviceStatus.DISCOVERED,
    organizationId: null,
    patientId: null,
    deletedAt: null,
    ...overrides,
  };
}

function makePrisma() {
  return {
    device: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
}

function makeBle(): any {
  return {
    isConnected: jest.fn().mockReturnValue(false),
    disconnect: jest.fn(),
  };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

describe('PairingService', () => {
  let service: PairingService;
  let prisma: ReturnType<typeof makePrisma>;
  let ble: ReturnType<typeof makeBle>;
  let audit: ReturnType<typeof makeAudit>;

  beforeEach(() => {
    prisma = makePrisma();
    ble = makeBle();
    audit = makeAudit();
    service = new PairingService(prisma as any, audit as any, ble as any);
  });

  // ── pair ───────────────────────────────────────────────────────────────────

  describe('pair', () => {
    it('pareia dispositivo e registra auditoria', async () => {
      const device = makeDevice();
      prisma.device.findFirst.mockResolvedValue(device);
      const updated = { ...device, status: DeviceStatus.PAIRED, pairedBy: ADMIN.sub };
      prisma.device.update.mockResolvedValue(updated);

      const result = await service.pair('dev-1', {}, ADMIN, CTX);

      expect(prisma.device.update).toHaveBeenCalledWith({
        where: { id: 'dev-1' },
        data: expect.objectContaining({ status: DeviceStatus.PAIRED, pairedBy: ADMIN.sub }),
      });
      expect(audit.log).toHaveBeenCalledWith('DEVICE_PAIRED', expect.anything());
      expect(result.status).toBe(DeviceStatus.PAIRED);
    });

    it('PROFESSIONAL pode parear', async () => {
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      prisma.device.update.mockResolvedValue(makeDevice({ status: DeviceStatus.PAIRED }));
      await expect(service.pair('dev-1', {}, PROFESSIONAL, CTX)).resolves.toBeDefined();
    });

    it('DOCTOR pode parear', async () => {
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      prisma.device.update.mockResolvedValue(makeDevice({ status: DeviceStatus.PAIRED }));
      await expect(service.pair('dev-1', {}, DOCTOR, CTX)).resolves.toBeDefined();
    });

    it('PATIENT lança ForbiddenException', async () => {
      await expect(service.pair('dev-1', {}, PATIENT, CTX)).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException se dispositivo não existe', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      await expect(service.pair('dev-1', {}, ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });

    it('usa organizationId e patientId do dto quando fornecidos', async () => {
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      prisma.device.update.mockResolvedValue(makeDevice());
      const dto = { organizationId: 'org-1', patientId: 'pat-2' };
      await service.pair('dev-1', dto, ADMIN, CTX);
      expect(prisma.device.update).toHaveBeenCalledWith({
        where: { id: 'dev-1' },
        data: expect.objectContaining({ organizationId: 'org-1', patientId: 'pat-2' }),
      });
    });
  });

  // ── unpair ─────────────────────────────────────────────────────────────────

  describe('unpair', () => {
    it('desvincula dispositivo e registra auditoria', async () => {
      prisma.device.findFirst.mockResolvedValue(makeDevice({ patientId: 'pat-1' }));
      prisma.device.update.mockResolvedValue(makeDevice({ status: DeviceStatus.DISCONNECTED }));

      await service.unpair('dev-1', ADMIN, CTX);

      expect(prisma.device.update).toHaveBeenCalledWith({
        where: { id: 'dev-1' },
        data: expect.objectContaining({
          status: DeviceStatus.DISCONNECTED,
          patientId: null,
          pairedBy: null,
          pairedAt: null,
        }),
      });
      expect(audit.log).toHaveBeenCalledWith('DEVICE_UNPAIRED', expect.anything());
    });

    it('desconecta via BLE se dispositivo estiver conectado', async () => {
      ble.isConnected.mockReturnValue(true);
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      prisma.device.update.mockResolvedValue(makeDevice());

      await service.unpair('dev-1', ADMIN, CTX);

      expect(ble.disconnect).toHaveBeenCalledWith('dev-1', undefined, 'unpaired');
    });

    it('não chama ble.disconnect se não estiver conectado', async () => {
      ble.isConnected.mockReturnValue(false);
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      prisma.device.update.mockResolvedValue(makeDevice());

      await service.unpair('dev-1', ADMIN, CTX);

      expect(ble.disconnect).not.toHaveBeenCalled();
    });

    it('PATIENT lança ForbiddenException', async () => {
      await expect(service.unpair('dev-1', PATIENT, CTX)).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException se dispositivo não existe', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      await expect(service.unpair('dev-1', ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });

    it('role desconhecida lança ForbiddenException', async () => {
      await expect(service.unpair('dev-1', { sub: 'u', role: 'GUEST' }, CTX)).rejects.toThrow(ForbiddenException);
    });
  });
});

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SessionsService } from '../sessions/services/sessions.service';
import { DeviceSessionStatus, DeviceStatus } from '@bio/database';

const CTX = { ip: '127.0.0.1', userAgent: 'test' };
const ADMIN = { sub: 'admin-1', role: 'ADMIN' };
const PATIENT_OWNER = { sub: 'user-1', role: 'PATIENT' };
const PATIENT_OTHER = { sub: 'user-2', role: 'PATIENT' };

function makeDevice(overrides: any = {}) {
  return { id: 'dev-1', patientId: 'pat-1', status: DeviceStatus.PAIRED, deletedAt: null, ...overrides };
}

function makeSession(overrides: any = {}) {
  return {
    id: 'ses-1',
    deviceId: 'dev-1',
    status: DeviceSessionStatus.ACTIVE,
    startedAt: new Date('2026-01-01T10:00:00Z'),
    endedAt: null,
    bytesReceived: BigInt(0),
    bytesSent: BigInt(0),
    reconnections: 0,
    signalQuality: null,
    latencyMs: null,
    error: null,
    ...overrides,
  };
}

function makePrisma() {
  return {
    device: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    patient: {
      findFirst: jest.fn(),
    },
    deviceSession: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

function makeBle(): any {
  return { connect: jest.fn(), disconnect: jest.fn() };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

describe('SessionsService', () => {
  let service: SessionsService;
  let prisma: ReturnType<typeof makePrisma>;
  let ble: ReturnType<typeof makeBle>;
  let audit: ReturnType<typeof makeAudit>;

  beforeEach(() => {
    prisma = makePrisma();
    ble = makeBle();
    audit = makeAudit();
    service = new SessionsService(prisma as any, audit as any, ble as any);
  });

  // ── startSession ────────────────────────────────────────────────────────────

  describe('startSession', () => {
    it('cria sessão, atualiza dispositivo e emite conexão BLE', async () => {
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      prisma.deviceSession.create.mockResolvedValue(makeSession());
      prisma.device.update.mockResolvedValue(makeDevice({ status: DeviceStatus.CONNECTED }));

      const result = await service.startSession('dev-1', ADMIN, CTX);

      expect(prisma.deviceSession.create).toHaveBeenCalledWith({
        data: { deviceId: 'dev-1', status: DeviceSessionStatus.ACTIVE },
      });
      expect(prisma.device.update).toHaveBeenCalledWith({
        where: { id: 'dev-1' },
        data: expect.objectContaining({ status: DeviceStatus.CONNECTED, totalConnections: { increment: 1 } }),
      });
      expect(ble.connect).toHaveBeenCalledWith('dev-1', 'ses-1');
      expect(audit.log).toHaveBeenCalledWith('SESSION_STARTED', expect.anything());
      expect(result.id).toBe('ses-1');
    });

    it('lança NotFoundException se dispositivo não existe', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      await expect(service.startSession('ghost', ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });

    it('SECURITY (IDOR): PATIENT não pode iniciar sessão em dispositivo de outro paciente', async () => {
      prisma.device.findFirst.mockResolvedValue(makeDevice({ patientId: 'pat-1' }));
      prisma.patient.findFirst.mockResolvedValue({ id: 'pat-2' }); // paciente do ator é outro
      await expect(service.startSession('dev-1', PATIENT_OTHER, CTX)).rejects.toThrow(ForbiddenException);
    });

    it('PATIENT dono do dispositivo pode iniciar a própria sessão', async () => {
      prisma.device.findFirst.mockResolvedValue(makeDevice({ patientId: 'pat-1' }));
      prisma.patient.findFirst.mockResolvedValue({ id: 'pat-1' });
      prisma.deviceSession.create.mockResolvedValue(makeSession());
      prisma.device.update.mockResolvedValue(makeDevice());
      const result = await service.startSession('dev-1', PATIENT_OWNER, CTX);
      expect(result.id).toBe('ses-1');
    });
  });

  // ── endSession ──────────────────────────────────────────────────────────────

  describe('endSession', () => {
    it('encerra sessão com status ENDED e atualiza dispositivo', async () => {
      const session = makeSession();
      prisma.deviceSession.findFirst.mockResolvedValue(session);
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      const ended = makeSession({ status: DeviceSessionStatus.ENDED, endedAt: new Date() });
      prisma.deviceSession.update.mockResolvedValue(ended);
      prisma.device.update.mockResolvedValue(makeDevice());

      const result = await service.endSession('ses-1', ADMIN, CTX);

      expect(prisma.deviceSession.update).toHaveBeenCalledWith({
        where: { id: 'ses-1' },
        data: expect.objectContaining({ status: DeviceSessionStatus.ENDED }),
      });
      expect(prisma.device.update).toHaveBeenCalledWith({
        where: { id: 'dev-1' },
        data: expect.objectContaining({ status: DeviceStatus.DISCONNECTED }),
      });
      expect(ble.disconnect).toHaveBeenCalledWith('dev-1', 'ses-1', undefined);
      expect(audit.log).toHaveBeenCalledWith('SESSION_ENDED', expect.anything());
    });

    it('encerra com ERROR se opts.error fornecido e incrementa totalErrors', async () => {
      prisma.deviceSession.findFirst.mockResolvedValue(makeSession());
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      prisma.deviceSession.update.mockResolvedValue(makeSession({ status: DeviceSessionStatus.ERROR }));
      prisma.device.update.mockResolvedValue(makeDevice());

      await service.endSession('ses-1', ADMIN, CTX, { error: 'timeout' });

      expect(prisma.deviceSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: DeviceSessionStatus.ERROR, error: 'timeout' }),
        }),
      );
      expect(prisma.device.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalErrors: { increment: 1 } }),
        }),
      );
    });

    it('lança NotFoundException se sessão não existe', async () => {
      prisma.deviceSession.findFirst.mockResolvedValue(null);
      await expect(service.endSession('ghost', ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });

    it('SECURITY (IDOR): PATIENT não pode encerrar sessão de dispositivo de outro paciente', async () => {
      prisma.deviceSession.findFirst.mockResolvedValue(makeSession());
      prisma.device.findFirst.mockResolvedValue(makeDevice({ patientId: 'pat-1' }));
      prisma.patient.findFirst.mockResolvedValue({ id: 'pat-2' });
      await expect(service.endSession('ses-1', PATIENT_OTHER, CTX)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findSessions ────────────────────────────────────────────────────────────

  describe('findSessions', () => {
    it('retorna lista paginada de sessões para ADMIN', async () => {
      const sessions = [makeSession(), makeSession({ id: 'ses-2' })];
      prisma.$transaction.mockResolvedValue([sessions, 2]);

      const result = await service.findSessions(ADMIN, 1, 20);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('filtra por deviceId se fornecido', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      await service.findSessions(ADMIN, 1, 10, 'dev-2');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('SECURITY: PATIENT não pode listar sessões (visão global de dispositivos)', async () => {
      await expect(service.findSessions(PATIENT_OWNER, 1, 20)).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('retorna sessão por id para ADMIN', async () => {
      prisma.deviceSession.findFirst.mockResolvedValue(makeSession());
      prisma.device.findFirst.mockResolvedValue(makeDevice());
      const result = await service.findById('ses-1', ADMIN);
      expect(result.id).toBe('ses-1');
    });

    it('lança NotFoundException se não existe', async () => {
      prisma.deviceSession.findFirst.mockResolvedValue(null);
      await expect(service.findById('ghost', ADMIN)).rejects.toThrow(NotFoundException);
    });

    it('SECURITY (IDOR): PATIENT não pode ler sessão de dispositivo de outro paciente', async () => {
      prisma.deviceSession.findFirst.mockResolvedValue(makeSession());
      prisma.device.findFirst.mockResolvedValue(makeDevice({ patientId: 'pat-1' }));
      prisma.patient.findFirst.mockResolvedValue({ id: 'pat-2' });
      await expect(service.findById('ses-1', PATIENT_OTHER)).rejects.toThrow(ForbiddenException);
    });
  });
});

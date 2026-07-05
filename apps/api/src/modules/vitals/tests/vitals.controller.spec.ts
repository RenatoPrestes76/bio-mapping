import { Test, TestingModule } from '@nestjs/testing';
import { VitalsController } from '../controllers/vitals.controller';
import { VitalsService } from '../services/vitals.service';

describe('VitalsController', () => {
  let controller: VitalsController;
  let service: jest.Mocked<Pick<VitalsService, 'create' | 'findAll' | 'findOne' | 'update' | 'validate' | 'remove'>>;

  const user = { sub: 'user-1', email: 'user@test.com', role: 'PATIENT' as const };
  const req: any = { ip: '127.0.0.1', headers: { 'user-agent': 'jest-test' } };

  const recordResponse = {
    id: 'vital-1',
    patientId: 'patient-1',
    recordedAt: new Date(),
    source: 'MANUAL',
    status: 'DRAFT',
    bmi: 26.12,
    bmiClassification: 'Sobrepeso',
  } as any;

  const paginated = { data: [recordResponse], total: 1, page: 1, limit: 20, totalPages: 1 };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(recordResponse),
      findAll: jest.fn().mockResolvedValue(paginated),
      findOne: jest.fn().mockResolvedValue(recordResponse),
      update: jest.fn().mockResolvedValue(recordResponse),
      validate: jest.fn().mockResolvedValue({ ...recordResponse, status: 'VALIDATED' }),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VitalsController],
      providers: [{ provide: VitalsService, useValue: service }],
    }).compile();

    controller = module.get(VitalsController);
  });

  it('create() delega ao service com patientId e contexto', async () => {
    const dto = { recordedAt: '2025-06-01T08:00:00Z', height: 175, weight: 80 };
    await controller.create('patient-1', dto as any, user, req);
    expect(service.create).toHaveBeenCalledWith('patient-1', dto, user, {
      ip: '127.0.0.1',
      userAgent: 'jest-test',
    });
  });

  it('findAll() delega ao service com filtros', async () => {
    const query = { page: 1, limit: 20 };
    const result = await controller.findAll('patient-1', query as any, user);
    expect(service.findAll).toHaveBeenCalledWith('patient-1', query, user);
    expect(result.data).toHaveLength(1);
  });

  it('findOne() delega ao service por ID', async () => {
    await controller.findOne('vital-1', user);
    expect(service.findOne).toHaveBeenCalledWith('vital-1', user);
  });

  it('update() delega ao service com DTO e contexto', async () => {
    const dto = { weight: 85 };
    await controller.update('vital-1', dto as any, user, req);
    expect(service.update).toHaveBeenCalledWith('vital-1', dto, user, {
      ip: '127.0.0.1',
      userAgent: 'jest-test',
    });
  });

  it('validate() delega ao service', async () => {
    const result = await controller.validate('vital-1', user, req);
    expect(service.validate).toHaveBeenCalledWith('vital-1', user, {
      ip: '127.0.0.1',
      userAgent: 'jest-test',
    });
    expect(result.status).toBe('VALIDATED');
  });

  it('remove() delega ao service e retorna void', async () => {
    await controller.remove('vital-1', user, req);
    expect(service.remove).toHaveBeenCalledWith('vital-1', user, {
      ip: '127.0.0.1',
      userAgent: 'jest-test',
    });
  });
});

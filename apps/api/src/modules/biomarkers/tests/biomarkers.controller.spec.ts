import { Test, TestingModule } from '@nestjs/testing';
import { BiomarkersController } from '../controllers/biomarkers.controller';
import { BiomarkersService } from '../services/biomarkers.service';

describe('BiomarkersController', () => {
  let controller: BiomarkersController;
  let service: jest.Mocked<Pick<BiomarkersService, 'create' | 'findAll' | 'update' | 'remove'>>;

  const user = { sub: 'user-1', email: 'user@test.com', role: 'PATIENT' as const };
  const req: any = { ip: '127.0.0.1', headers: { 'user-agent': 'jest-test' } };

  const bioResponse = {
    id: 'bio-1',
    vitalRecordId: 'vital-1',
    name: 'Glicose',
    value: 95,
    unit: 'mg/dL',
    status: 'NORMAL',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(bioResponse),
      findAll: jest.fn().mockResolvedValue([bioResponse]),
      update: jest.fn().mockResolvedValue(bioResponse),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BiomarkersController],
      providers: [{ provide: BiomarkersService, useValue: service }],
    }).compile();

    controller = module.get(BiomarkersController);
  });

  it('create() delega ao service com vitalRecordId e contexto', async () => {
    const dto = { name: 'Glicose', value: 95, unit: 'mg/dL' };
    await controller.create('vital-1', dto as any, user, req);
    expect(service.create).toHaveBeenCalledWith('vital-1', dto, user, {
      ip: '127.0.0.1',
      userAgent: 'jest-test',
    });
  });

  it('findAll() retorna lista de biomarcadores', async () => {
    const result = await controller.findAll('vital-1', user);
    expect(service.findAll).toHaveBeenCalledWith('vital-1', user);
    expect(result).toHaveLength(1);
  });

  it('update() delega ao service com ID e DTO', async () => {
    const dto = { value: 110 };
    await controller.update('bio-1', dto as any, user, req);
    expect(service.update).toHaveBeenCalledWith('bio-1', dto, user, {
      ip: '127.0.0.1',
      userAgent: 'jest-test',
    });
  });

  it('remove() delega ao service e retorna void', async () => {
    await controller.remove('bio-1', user, req);
    expect(service.remove).toHaveBeenCalledWith('bio-1', user, {
      ip: '127.0.0.1',
      userAgent: 'jest-test',
    });
  });
});

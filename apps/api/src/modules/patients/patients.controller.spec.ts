import { Test, TestingModule } from '@nestjs/testing';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

describe('PatientsController', () => {
  let controller: PatientsController;
  let service: {
    create: jest.Mock; findAll: jest.Mock; findById: jest.Mock;
    update: jest.Mock; delete: jest.Mock;
  };

  const user = { sub: 'user-1', email: 'jane@example.com', role: 'PATIENT' as const };
  const patient = { id: 'pat-1', userId: 'user-1', registrationCode: 'PAT-ABCD' } as any;
  const paginated = { data: [patient], total: 1, page: 1, limit: 20, totalPages: 1 };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(patient),
      findAll: jest.fn().mockResolvedValue(paginated),
      findById: jest.fn().mockResolvedValue(patient),
      update: jest.fn().mockResolvedValue(patient),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientsController],
      providers: [{ provide: PatientsService, useValue: service }],
    }).compile();

    controller = module.get(PatientsController);
  });

  it('create() delegates to service', async () => {
    await controller.create(user, {});
    expect(service.create).toHaveBeenCalledWith('user-1', {});
  });

  it('findAll() delegates to service', async () => {
    const result = await controller.findAll({});
    expect(result.data).toHaveLength(1);
  });

  it('findById() delegates to service', async () => {
    await controller.findById('pat-1');
    expect(service.findById).toHaveBeenCalledWith('pat-1');
  });

  it('update() delegates to service', async () => {
    await controller.update('pat-1', { weight: 80 }, user);
    expect(service.update).toHaveBeenCalledWith('pat-1', { weight: 80 }, 'user-1');
  });

  it('delete() delegates to service', async () => {
    await controller.delete('pat-1', user);
    expect(service.delete).toHaveBeenCalledWith('pat-1', 'user-1');
  });
});

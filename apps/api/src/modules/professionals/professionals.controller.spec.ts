import { Test, TestingModule } from '@nestjs/testing';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService } from './professionals.service';

describe('ProfessionalsController', () => {
  let controller: ProfessionalsController;
  let service: {
    create: jest.Mock; findAll: jest.Mock; findById: jest.Mock;
    updateMine: jest.Mock; deleteMine: jest.Mock;
  };

  const user = { sub: 'user-1', email: 'jane@example.com', role: 'PATIENT' as const };
  const professional = { id: 'pro-1', userId: 'user-1', specialty: 'DOCTOR' } as any;
  const paginated = { data: [professional], total: 1, page: 1, limit: 20, totalPages: 1 };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(professional),
      findAll: jest.fn().mockResolvedValue(paginated),
      findById: jest.fn().mockResolvedValue(professional),
      updateMine: jest.fn().mockResolvedValue(professional),
      deleteMine: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfessionalsController],
      providers: [{ provide: ProfessionalsService, useValue: service }],
    }).compile();

    controller = module.get(ProfessionalsController);
  });

  it('create() delegates to service', async () => {
    await controller.create(user, { specialty: 'DOCTOR' as any });
    expect(service.create).toHaveBeenCalledWith('user-1', { specialty: 'DOCTOR' });
  });

  it('findAll() delegates to service', async () => {
    const result = await controller.findAll({});
    expect(service.findAll).toHaveBeenCalledWith({});
    expect(result.data).toHaveLength(1);
  });

  it('getMyProfessional() delegates findById with userId', async () => {
    await controller.getMyProfessional(user);
    expect(service.findById).toHaveBeenCalledWith('user-1');
  });

  it('findById() delegates to service', async () => {
    await controller.findById('pro-1');
    expect(service.findById).toHaveBeenCalledWith('pro-1');
  });

  it('updateMine() delegates to service', async () => {
    await controller.updateMine(user, { bio: 'Updated' });
    expect(service.updateMine).toHaveBeenCalledWith('user-1', { bio: 'Updated' });
  });

  it('deleteMine() delegates to service', async () => {
    await controller.deleteMine(user);
    expect(service.deleteMine).toHaveBeenCalledWith('user-1');
  });
});

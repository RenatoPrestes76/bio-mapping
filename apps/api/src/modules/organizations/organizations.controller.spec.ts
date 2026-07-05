import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let service: {
    create: jest.Mock; findMyOrganizations: jest.Mock; findById: jest.Mock;
    update: jest.Mock; delete: jest.Mock;
  };

  const user = { sub: 'user-1', email: 'jane@example.com', role: 'ADMIN' as const };
  const org = { id: 'org-1', name: 'Clínica A' } as any;
  const paginated = { data: [org], total: 1, page: 1, limit: 20, totalPages: 1 };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(org),
      findMyOrganizations: jest.fn().mockResolvedValue(paginated),
      findById: jest.fn().mockResolvedValue(org),
      update: jest.fn().mockResolvedValue(org),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [{ provide: OrganizationsService, useValue: service }],
    }).compile();

    controller = module.get(OrganizationsController);
  });

  it('create() delegates to service', async () => {
    await controller.create(user, { name: 'Clínica A' });
    expect(service.create).toHaveBeenCalledWith('user-1', { name: 'Clínica A' });
  });

  it('findAll() delegates to service', async () => {
    const result = await controller.findAll(user, { page: 1, limit: 20 });
    expect(service.findMyOrganizations).toHaveBeenCalledWith('user-1', { page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
  });

  it('findById() delegates to service', async () => {
    await controller.findById('org-1');
    expect(service.findById).toHaveBeenCalledWith('org-1');
  });

  it('update() delegates to service', async () => {
    await controller.update('org-1', user, { name: 'Updated' });
    expect(service.update).toHaveBeenCalledWith('org-1', 'user-1', { name: 'Updated' });
  });

  it('delete() delegates to service', async () => {
    await controller.delete('org-1', user);
    expect(service.delete).toHaveBeenCalledWith('org-1', 'user-1');
  });
});

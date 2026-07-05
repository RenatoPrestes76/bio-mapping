import { Test, TestingModule } from '@nestjs/testing';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';

describe('MembershipController', () => {
  let controller: MembershipController;
  let service: { listMembers: jest.Mock; updateRole: jest.Mock; removeMember: jest.Mock };

  const actor = { sub: 'admin-1', email: 'admin@x.com', role: 'ADMIN' as const };
  const membership = { id: 'mem-1', organizationId: 'org-1', userId: 'user-2', role: 'PATIENT' } as any;
  const paginated = { data: [membership], total: 1, page: 1, limit: 20, totalPages: 1 };

  beforeEach(async () => {
    service = {
      listMembers: jest.fn().mockResolvedValue(paginated),
      updateRole: jest.fn().mockResolvedValue({ ...membership, role: 'PROFESSIONAL' }),
      removeMember: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembershipController],
      providers: [{ provide: MembershipService, useValue: service }],
    }).compile();

    controller = module.get(MembershipController);
  });

  it('listMembers() delegates to service', async () => {
    const result = await controller.listMembers('org-1', { page: 1, limit: 20 });
    expect(service.listMembers).toHaveBeenCalledWith('org-1', { page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
  });

  it('updateRole() delegates to service', async () => {
    await controller.updateRole('org-1', 'user-2', actor, { role: 'PROFESSIONAL' as any });
    expect(service.updateRole).toHaveBeenCalledWith('org-1', 'user-2', 'admin-1', { role: 'PROFESSIONAL' });
  });

  it('removeMember() delegates to service', async () => {
    await controller.removeMember('org-1', 'user-2', actor);
    expect(service.removeMember).toHaveBeenCalledWith('org-1', 'user-2', 'admin-1');
  });
});

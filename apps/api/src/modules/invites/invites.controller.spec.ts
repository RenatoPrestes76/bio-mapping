import { Test, TestingModule } from '@nestjs/testing';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

describe('InvitesController', () => {
  let controller: InvitesController;
  let service: { send: jest.Mock; listMyInvites: jest.Mock; accept: jest.Mock; reject: jest.Mock };

  const user = { sub: 'user-1', email: 'jane@example.com', role: 'PATIENT' as const };
  const invite = { id: 'inv-1', email: 'jane@example.com', status: 'PENDING' } as any;

  beforeEach(async () => {
    service = {
      send: jest.fn().mockResolvedValue(invite),
      listMyInvites: jest.fn().mockResolvedValue([invite]),
      accept: jest.fn().mockResolvedValue(undefined),
      reject: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitesController],
      providers: [{ provide: InvitesService, useValue: service }],
    }).compile();

    controller = module.get(InvitesController);
  });

  it('send() delegates to service', async () => {
    await controller.send('org-1', user, { email: 'jane@example.com', role: 'PATIENT' as any });
    expect(service.send).toHaveBeenCalledWith('org-1', 'user-1', expect.objectContaining({ email: 'jane@example.com' }));
  });

  it('listMyInvites() delegates to service with user email', async () => {
    const result = await controller.listMyInvites(user);
    expect(service.listMyInvites).toHaveBeenCalledWith('jane@example.com');
    expect(result).toHaveLength(1);
  });

  it('accept() delegates to service', async () => {
    await controller.accept('token-abc', user);
    expect(service.accept).toHaveBeenCalledWith('token-abc', 'user-1', 'jane@example.com');
  });

  it('reject() delegates to service', async () => {
    await controller.reject('token-abc', user);
    expect(service.reject).toHaveBeenCalledWith('token-abc', 'user-1', 'jane@example.com');
  });
});

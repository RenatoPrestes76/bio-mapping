import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

describe('ProfilesController', () => {
  let controller: ProfilesController;
  let service: {
    create: jest.Mock; getMyProfile: jest.Mock; update: jest.Mock;
    delete: jest.Mock; uploadAvatar: jest.Mock; getAvatar: jest.Mock;
  };

  const user = { sub: 'user-1', email: 'jane@example.com', role: 'PATIENT' as const };
  const profile = { id: 'p-1', userId: 'user-1', fullName: 'Jane Doe' } as any;

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(profile),
      getMyProfile: jest.fn().mockResolvedValue(profile),
      update: jest.fn().mockResolvedValue(profile),
      delete: jest.fn().mockResolvedValue(undefined),
      uploadAvatar: jest.fn().mockResolvedValue({ ...profile, photo: '/api/v1/profiles/user-1/avatar' }),
      getAvatar: jest.fn().mockResolvedValue({ path: '/app/uploads/avatars/img.jpg', mimeType: 'image/jpeg' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [{ provide: ProfilesService, useValue: service }],
    }).compile();

    controller = module.get(ProfilesController);
  });

  it('create() delegates to service', async () => {
    await controller.create(user, { fullName: 'Jane Doe' });
    expect(service.create).toHaveBeenCalledWith('user-1', { fullName: 'Jane Doe' });
  });

  it('getMyProfile() delegates to service', async () => {
    await controller.getMyProfile(user);
    expect(service.getMyProfile).toHaveBeenCalledWith('user-1');
  });

  it('update() delegates to service', async () => {
    await controller.update(user, { fullName: 'Updated' });
    expect(service.update).toHaveBeenCalledWith('user-1', { fullName: 'Updated' });
  });

  it('delete() delegates to service', async () => {
    await controller.delete(user);
    expect(service.delete).toHaveBeenCalledWith('user-1');
  });

  it('uploadAvatar() delegates to service with file', async () => {
    const file = { originalname: 'img.jpg', buffer: Buffer.from('') } as any;
    const result = await controller.uploadAvatar(user, file);
    expect(service.uploadAvatar).toHaveBeenCalledWith('user-1', file);
    expect(result.photo).toBe('/api/v1/profiles/user-1/avatar');
  });

  it('uploadAvatar() throws BadRequestException when no file', () => {
    expect(() => controller.uploadAvatar(user, undefined as any)).toThrow(BadRequestException);
  });

  it('getAvatar() streams the file with the correct Content-Type', async () => {
    const res = { setHeader: jest.fn(), sendFile: jest.fn() } as any;
    await controller.getAvatar('user-2', res);

    expect(service.getAvatar).toHaveBeenCalledWith('user-2');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
    expect(res.sendFile).toHaveBeenCalledWith('/app/uploads/avatars/img.jpg');
  });
});

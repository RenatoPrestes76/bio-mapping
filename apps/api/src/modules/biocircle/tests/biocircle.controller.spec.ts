import { BioCircleController } from '../controllers/biocircle.controller.js';

const CONNECTION = {
  id: 'c1', requesterId: 'u1', receiverId: 'u2',
  relationshipType: 'FRIEND', status: 'PENDING',
  tenantId: null, acceptedAt: null, createdAt: new Date(), updatedAt: new Date(),
};

const USER = { sub: 'u1' };

const mockService = {
  getDashboard: jest.fn(),
  searchUsers: jest.fn(),
  sendInvite: jest.fn(),
  findConnections: jest.fn(),
  findReceivedInvites: jest.fn(),
  findSentInvites: jest.fn(),
  accept: jest.fn(),
  reject: jest.fn(),
  block: jest.fn(),
  remove: jest.fn(),
  getPrivacySettings: jest.fn(),
  updatePrivacySettings: jest.fn(),
  getNotifications: jest.fn(),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
};

describe('BioCircleController', () => {
  let controller: BioCircleController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new BioCircleController(mockService as never);
  });

  it('getDashboard — delegates with userId', async () => {
    mockService.getDashboard.mockResolvedValue({ acceptedCount: 0 });
    await controller.getDashboard(USER);
    expect(mockService.getDashboard).toHaveBeenCalledWith('u1');
  });

  it('searchUsers — passes query and userId', async () => {
    mockService.searchUsers.mockResolvedValue([]);
    await controller.searchUsers('maria', USER);
    expect(mockService.searchUsers).toHaveBeenCalledWith('maria', 'u1');
  });

  it('sendInvite — delegates with requesterId', async () => {
    mockService.sendInvite.mockResolvedValue(CONNECTION);
    const result = await controller.sendInvite({ receiverId: 'u2', relationshipType: 'FRIEND' as never }, USER);
    expect(mockService.sendInvite).toHaveBeenCalledWith('u1', expect.objectContaining({ receiverId: 'u2' }));
    expect(result).toEqual(CONNECTION);
  });

  it('findConnections — returns accepted connections', async () => {
    mockService.findConnections.mockResolvedValue([CONNECTION]);
    const result = await controller.findConnections(USER);
    expect(result).toHaveLength(1);
  });

  it('findReceived — returns pending received invites', async () => {
    mockService.findReceivedInvites.mockResolvedValue([CONNECTION]);
    await controller.findReceived(USER);
    expect(mockService.findReceivedInvites).toHaveBeenCalledWith('u1');
  });

  it('findSent — returns pending sent invites', async () => {
    mockService.findSentInvites.mockResolvedValue([]);
    await controller.findSent(USER);
    expect(mockService.findSentInvites).toHaveBeenCalledWith('u1');
  });

  it('accept — delegates with connectionId and userId', async () => {
    mockService.accept.mockResolvedValue({ ...CONNECTION, status: 'ACCEPTED' });
    const result = await controller.accept('c1', USER);
    expect(mockService.accept).toHaveBeenCalledWith('c1', 'u1');
    expect(result.status).toBe('ACCEPTED');
  });

  it('reject — delegates correctly', async () => {
    mockService.reject.mockResolvedValue({ ...CONNECTION, status: 'REJECTED' });
    await controller.reject('c1', USER);
    expect(mockService.reject).toHaveBeenCalledWith('c1', 'u1');
  });

  it('block — delegates correctly', async () => {
    mockService.block.mockResolvedValue({ ...CONNECTION, status: 'BLOCKED' });
    await controller.block('c1', USER);
    expect(mockService.block).toHaveBeenCalledWith('c1', 'u1');
  });

  it('remove — delegates with userId', async () => {
    mockService.remove.mockResolvedValue({ ...CONNECTION, status: 'REMOVED' });
    await controller.remove('c1', USER);
    expect(mockService.remove).toHaveBeenCalledWith('c1', 'u1');
  });

  it('getPrivacy — returns settings', async () => {
    mockService.getPrivacySettings.mockResolvedValue(null);
    await controller.getPrivacy(USER);
    expect(mockService.getPrivacySettings).toHaveBeenCalledWith('u1');
  });

  it('updatePrivacy — delegates dto and userId', async () => {
    const settings = { discoverableBy: 'EVERYONE' };
    mockService.updatePrivacySettings.mockResolvedValue(settings);
    await controller.updatePrivacy({ discoverableBy: 'EVERYONE' as never }, USER);
    expect(mockService.updatePrivacySettings).toHaveBeenCalledWith('u1', expect.objectContaining({ discoverableBy: 'EVERYONE' }));
  });

  it('getNotifications — returns list', async () => {
    mockService.getNotifications.mockResolvedValue([]);
    await controller.getNotifications(USER);
    expect(mockService.getNotifications).toHaveBeenCalledWith('u1');
  });

  it('markRead — delegates notification id', async () => {
    mockService.markNotificationRead.mockResolvedValue(undefined);
    await controller.markRead('n1');
    expect(mockService.markNotificationRead).toHaveBeenCalledWith('n1');
  });
});

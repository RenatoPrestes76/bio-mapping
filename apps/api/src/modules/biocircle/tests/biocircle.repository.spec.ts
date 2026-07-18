import { BioCircleRepository } from '../repositories/biocircle.repository.js';

const CONNECTION = {
  id: 'c1', requesterId: 'u1', receiverId: 'u2',
  relationshipType: 'FRIEND', status: 'PENDING',
  tenantId: null, acceptedAt: null, createdAt: new Date(), updatedAt: new Date(),
};

const mockPrisma = {
  bioConnection: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  userPrivacySettings: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('BioCircleRepository', () => {
  let repo: BioCircleRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new BioCircleRepository(mockPrisma as never);
  });

  it('creates a connection', async () => {
    mockPrisma.bioConnection.create.mockResolvedValue(CONNECTION);
    const result = await repo.createConnection({ requesterId: 'u1', receiverId: 'u2', relationshipType: 'FRIEND' as never });
    expect(result).toEqual(CONNECTION);
    expect(mockPrisma.bioConnection.create).toHaveBeenCalledTimes(1);
  });

  it('finds connection by pair', async () => {
    mockPrisma.bioConnection.findUnique.mockResolvedValue(CONNECTION);
    const result = await repo.findByPair('u1', 'u2');
    expect(mockPrisma.bioConnection.findUnique).toHaveBeenCalledWith({
      where: { requesterId_receiverId: { requesterId: 'u1', receiverId: 'u2' } },
    });
    expect(result).toEqual(CONNECTION);
  });

  it('returns null when pair not found', async () => {
    mockPrisma.bioConnection.findUnique.mockResolvedValue(null);
    expect(await repo.findByPair('x', 'y')).toBeNull();
  });

  it('finds accepted connections for a user (both directions)', async () => {
    mockPrisma.bioConnection.findMany.mockResolvedValue([CONNECTION]);
    await repo.findAccepted('u1');
    expect(mockPrisma.bioConnection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'ACCEPTED' }) }),
    );
  });

  it('updates connection status', async () => {
    const updated = { ...CONNECTION, status: 'ACCEPTED', acceptedAt: new Date() };
    mockPrisma.bioConnection.update.mockResolvedValue(updated);
    const result = await repo.updateStatus('c1', 'ACCEPTED' as never, { acceptedAt: new Date() });
    expect(result.status).toBe('ACCEPTED');
  });

  it('upserts privacy settings', async () => {
    const settings = { id: 's1', userId: 'u1', discoverableBy: 'EVERYONE', invitesFrom: 'EVERYONE',
      bioBookVisible: 'CONNECTIONS', photosVisible: 'CONNECTIONS', metricsVisible: 'CONNECTIONS',
      achievementsVisible: 'CONNECTIONS', createdAt: new Date(), updatedAt: new Date() };
    mockPrisma.userPrivacySettings.upsert.mockResolvedValue(settings);
    const result = await repo.upsertPrivacySettings('u1', { discoverableBy: 'EVERYONE' as never });
    expect(result).toEqual(settings);
  });

  it('finds privacy settings', async () => {
    mockPrisma.userPrivacySettings.findUnique.mockResolvedValue(null);
    const result = await repo.findPrivacySettings('u1');
    expect(result).toBeNull();
  });
});

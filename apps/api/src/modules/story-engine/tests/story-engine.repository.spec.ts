import { StoryEngineRepository } from '../repositories/story-engine.repository.js';

const mockPrisma = {
  bioBookChapter: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  chapterShare: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('StoryEngineRepository', () => {
  let repo: StoryEngineRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new StoryEngineRepository(mockPrisma as never);
  });

  const CHAPTER = {
    id: 'c1',
    userId: 'u1',
    title: 'O Início',
    chapterType: 'FIRST_ASSESSMENT',
    summary: 'Resumo',
    startDate: new Date('2025-01-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
    tenantId: null,
    subtitle: null,
    coverImage: null,
    endDate: null,
    metadata: null,
    createdBy: null,
  };

  it('creates a chapter', async () => {
    mockPrisma.bioBookChapter.create.mockResolvedValue(CHAPTER);
    const result = await repo.createChapter({
      userId: 'u1',
      title: 'O Início',
      chapterType: 'FIRST_ASSESSMENT',
      summary: 'Resumo',
      startDate: new Date('2025-01-01'),
    });
    expect(mockPrisma.bioBookChapter.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(CHAPTER);
  });

  it('finds chapters by user ordered by startDate asc', async () => {
    mockPrisma.bioBookChapter.findMany.mockResolvedValue([CHAPTER]);
    const result = await repo.findByUser('u1');
    expect(mockPrisma.bioBookChapter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' }, orderBy: { startDate: 'asc' } }),
    );
    expect(result).toHaveLength(1);
  });

  it('finds chapter by id', async () => {
    mockPrisma.bioBookChapter.findUnique.mockResolvedValue(CHAPTER);
    const result = await repo.findById('c1');
    expect(result).toEqual(CHAPTER);
  });

  it('returns null when chapter not found', async () => {
    mockPrisma.bioBookChapter.findUnique.mockResolvedValue(null);
    const result = await repo.findById('nonexistent');
    expect(result).toBeNull();
  });

  it('updates a chapter', async () => {
    const updated = { ...CHAPTER, title: 'Novo Título' };
    mockPrisma.bioBookChapter.update.mockResolvedValue(updated);
    const result = await repo.updateChapter('c1', { title: 'Novo Título' });
    expect(mockPrisma.bioBookChapter.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { title: 'Novo Título' },
    });
    expect(result.title).toBe('Novo Título');
  });

  it('creates a share', async () => {
    const share = { id: 's1', chapterId: 'c1', sharedBy: 'u1', sharedWith: 'u2', message: null, createdAt: new Date() };
    mockPrisma.chapterShare.create.mockResolvedValue(share);
    const result = await repo.createShare({ chapterId: 'c1', sharedBy: 'u1', sharedWith: 'u2' });
    expect(result).toEqual(share);
  });

  it('finds shares by recipient', async () => {
    mockPrisma.chapterShare.findMany.mockResolvedValue([]);
    await repo.findSharedWith('u2');
    expect(mockPrisma.chapterShare.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sharedWith: 'u2' } }),
    );
  });
});

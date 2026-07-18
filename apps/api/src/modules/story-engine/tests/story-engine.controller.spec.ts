import { StoryEngineController } from '../controllers/story-engine.controller.js';

const CHAPTER = {
  id: 'c1', userId: 'u1', title: 'O Início da Jornada',
  chapterType: 'FIRST_ASSESSMENT', summary: 'Marco inicial.',
  startDate: new Date('2025-01-01'), createdAt: new Date(), updatedAt: new Date(),
  metadata: { generationKey: 'u1:FIRST_ASSESSMENT' },
};

const SHARE = {
  id: 's1', chapterId: 'c1', sharedBy: 'u1', sharedWith: 'u2', message: null, createdAt: new Date(),
};

const mockService = {
  generate: jest.fn(),
  findByUser: jest.fn(),
  getTimeline: jest.fn(),
  findSharedWith: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  share: jest.fn(),
};

const USER = { sub: 'u1' };

describe('StoryEngineController', () => {
  let controller: StoryEngineController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new StoryEngineController(mockService as never);
  });

  it('generate — delegates to service with userId', async () => {
    mockService.generate.mockResolvedValue([CHAPTER]);
    const result = await controller.generate(USER);
    expect(mockService.generate).toHaveBeenCalledWith('u1', 'u1');
    expect(result).toEqual([CHAPTER]);
  });

  it('findAll — returns chapters for current user', async () => {
    mockService.findByUser.mockResolvedValue([CHAPTER]);
    const result = await controller.findAll(USER);
    expect(mockService.findByUser).toHaveBeenCalledWith('u1');
    expect(result).toHaveLength(1);
  });

  it('getTimeline — returns story timeline', async () => {
    const timeline = [{ chapter: CHAPTER, events: [] }];
    mockService.getTimeline.mockResolvedValue(timeline);
    const result = await controller.getTimeline(USER);
    expect(mockService.getTimeline).toHaveBeenCalledWith('u1');
    expect(result).toEqual(timeline);
  });

  it('findOne — returns single chapter', async () => {
    mockService.findById.mockResolvedValue(CHAPTER);
    const result = await controller.findOne('c1');
    expect(mockService.findById).toHaveBeenCalledWith('c1');
    expect(result).toEqual(CHAPTER);
  });

  it('update — passes dto and userId', async () => {
    const updated = { ...CHAPTER, title: 'Novo Título' };
    mockService.update.mockResolvedValue(updated);
    const result = await controller.update('c1', { title: 'Novo Título' }, USER);
    expect(mockService.update).toHaveBeenCalledWith('c1', { title: 'Novo Título' }, 'u1');
    expect(result.title).toBe('Novo Título');
  });

  it('share — delegates with chapterId and sharedBy', async () => {
    mockService.share.mockResolvedValue(SHARE);
    const result = await controller.share('c1', { sharedWith: 'u2' }, USER);
    expect(mockService.share).toHaveBeenCalledWith('c1', { sharedWith: 'u2' }, 'u1');
    expect(result).toEqual(SHARE);
  });

  it('getShared — returns chapters shared with user', async () => {
    mockService.findSharedWith.mockResolvedValue([SHARE]);
    const result = await controller.getShared(USER);
    expect(mockService.findSharedWith).toHaveBeenCalledWith('u1');
    expect(result).toEqual([SHARE]);
  });
});

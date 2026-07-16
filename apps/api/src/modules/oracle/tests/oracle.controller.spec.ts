import { OracleController } from '../controllers/oracle.controller';
import { OracleService } from '../services/oracle.service';
import { HealthPlatform, HealthSourceStatus, OracleSyncStatus } from '@bio/database';

const mockOracleService = {
  getAuthUrl: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  sync: jest.fn(),
  getSources: jest.fn(),
  getSyncHistory: jest.fn(),
  getTimeline: jest.fn(),
};

const mockUser = { sub: 'user-1', patientId: 'patient-1', role: 'PATIENT' };

function mockSource(overrides = {}) {
  return {
    id: 'src-1',
    patientId: 'patient-1',
    platform: HealthPlatform.SIMULATOR,
    status: HealthSourceStatus.CONNECTED,
    scopes: ['all'],
    externalUserId: null,
    lastSyncAt: null,
    accessToken: null,
    refreshToken: null,
    tokenExpiresAt: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('OracleController', () => {
  let controller: OracleController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new OracleController(mockOracleService as unknown as OracleService);
  });

  describe('getAuthUrl', () => {
    it('returns url from service', () => {
      mockOracleService.getAuthUrl.mockReturnValue('https://auth.example.com/connect');
      const result = controller.getAuthUrl(HealthPlatform.FITBIT, 'http://localhost/cb', mockUser);
      expect(result).toEqual({ url: 'https://auth.example.com/connect' });
      expect(mockOracleService.getAuthUrl).toHaveBeenCalledWith('patient-1', HealthPlatform.FITBIT, 'http://localhost/cb');
    });
  });

  describe('connect', () => {
    it('calls oracle.connect and returns source response', async () => {
      mockOracleService.connect.mockResolvedValue(mockSource());
      const dto = { platform: HealthPlatform.SIMULATOR, code: 'code-123', redirectUri: 'http://localhost/cb' };
      const result = await controller.connect(dto, mockUser);
      expect(result.id).toBe('src-1');
      expect(result.platform).toBe(HealthPlatform.SIMULATOR);
    });
  });

  describe('disconnect', () => {
    it('calls oracle.disconnect and returns message', async () => {
      mockOracleService.disconnect.mockResolvedValue(undefined);
      const result = await controller.disconnect(HealthPlatform.SIMULATOR, mockUser);
      expect(result).toEqual({ message: 'Disconnected successfully' });
      expect(mockOracleService.disconnect).toHaveBeenCalledWith('patient-1', HealthPlatform.SIMULATOR);
    });
  });

  describe('sync', () => {
    it('returns pipeline result', async () => {
      const pipelineResult = { jobId: 'job-1', rawCount: 6, normalizedCount: 6, errorCount: 0, status: 'COMPLETED' };
      mockOracleService.sync.mockResolvedValue(pipelineResult);
      const result = await controller.sync({ platform: HealthPlatform.SIMULATOR, daysSince: 7 }, mockUser);
      expect(result).toEqual(pipelineResult);
    });
  });

  describe('getSources', () => {
    it('returns mapped source list', async () => {
      mockOracleService.getSources.mockResolvedValue([mockSource()]);
      const result = await controller.getSources(mockUser);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(HealthSourceStatus.CONNECTED);
    });
  });

  describe('getSyncHistory', () => {
    it('returns mapped sync job list', async () => {
      mockOracleService.getSyncHistory.mockResolvedValue([{
        id: 'job-1',
        sourceId: 'src-1',
        patientId: 'patient-1',
        platform: HealthPlatform.SIMULATOR,
        status: OracleSyncStatus.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
        rawRecordsCount: 6,
        normalizedCount: 6,
        errorCount: 0,
        errorMessage: null,
        metadata: null,
        createdAt: new Date(),
      }]);
      const result = await controller.getSyncHistory(mockUser);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(OracleSyncStatus.COMPLETED);
    });
  });

  describe('getTimeline', () => {
    it('returns data from service', async () => {
      const mockData = [{ id: 'data-1', value: 72, unit: 'bpm' }];
      mockOracleService.getTimeline.mockResolvedValue(mockData);
      const result = await controller.getTimeline(mockUser, {});
      expect(result).toEqual(mockData);
    });
  });
});

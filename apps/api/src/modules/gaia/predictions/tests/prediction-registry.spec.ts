import { PredictionRegistry } from '../prediction-registry';
import { PredictionModel } from '../prediction.types';

function buildModel(overrides: Partial<PredictionModel> = {}): PredictionModel {
  return {
    name: 'fake-model',
    predictionType: 'TREND',
    version: '1.0.0',
    requiredCapabilities: [],
    computeStates: jest.fn(),
    buildPredictionWindow: jest.fn(),
    buildRecommendations: jest.fn(),
    ...overrides,
  };
}

describe('PredictionRegistry', () => {
  let registry: PredictionRegistry;

  beforeEach(() => {
    registry = new PredictionRegistry();
  });

  it('registers a model and retrieves it by name', () => {
    const model = buildModel();
    registry.register(model);

    expect(registry.get('fake-model')).toBe(model);
  });

  it('returns undefined for an unregistered name', () => {
    expect(registry.get('unknown-model')).toBeUndefined();
  });

  it('defaults priority to 0 and enabled to true', () => {
    registry.register(buildModel());

    expect(registry.list()).toEqual([
      { name: 'fake-model', predictionType: 'TREND', version: '1.0.0', priority: 0, enabled: true },
    ]);
  });

  it('honors explicit priority/enabled at registration', () => {
    registry.register(buildModel(), { priority: 5, enabled: false });

    expect(registry.list()).toEqual([
      { name: 'fake-model', predictionType: 'TREND', version: '1.0.0', priority: 5, enabled: false },
    ]);
  });

  it('listEnabled() excludes disabled models', () => {
    const enabledModel = buildModel({ name: 'enabled-model' });
    const disabledModel = buildModel({ name: 'disabled-model' });
    registry.register(enabledModel);
    registry.register(disabledModel, { enabled: false });

    expect(registry.listEnabled()).toEqual([enabledModel]);
  });

  it('listEnabled() sorts by priority, highest first', () => {
    const low = buildModel({ name: 'low' });
    const high = buildModel({ name: 'high' });
    registry.register(low, { priority: 1 });
    registry.register(high, { priority: 10 });

    expect(registry.listEnabled().map((m) => m.name)).toEqual(['high', 'low']);
  });

  it('allows multiple models to share the same predictionType', () => {
    registry.register(buildModel({ name: 'lifestyle-trend', predictionType: 'TREND' }));
    registry.register(buildModel({ name: 'weight-trend', predictionType: 'TREND' }));

    expect(registry.listEnabled().map((m) => m.name).sort()).toEqual(['lifestyle-trend', 'weight-trend']);
  });

  it('setEnabled() toggles a registered model without re-registering it', () => {
    registry.register(buildModel());
    registry.setEnabled('fake-model', false);

    expect(registry.listEnabled()).toEqual([]);
    expect(registry.list()[0].enabled).toBe(false);
  });

  it('setEnabled() is a no-op for an unregistered name', () => {
    expect(() => registry.setEnabled('unknown-model', false)).not.toThrow();
  });

  it('re-registering the same name overwrites the previous entry', () => {
    registry.register(buildModel({ version: '1.0.0' }));
    registry.register(buildModel({ version: '2.0.0' }));

    expect(registry.list()).toHaveLength(1);
    expect(registry.list()[0].version).toBe('2.0.0');
  });
});

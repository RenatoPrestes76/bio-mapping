import { ClinicalRiskRegistry } from '../clinical-risk.registry';
import { ClinicalRiskModel } from '../clinical-risk.types';

function buildModel(overrides: Partial<ClinicalRiskModel> = {}): ClinicalRiskModel {
  return {
    category: 'METABOLIC' as ClinicalRiskModel['category'],
    name: 'fake-model',
    version: '1.0.0',
    scoringEngineName: 'risk-classification',
    requiredCapabilities: [],
    buildScoringInput: jest.fn(),
    buildRecommendations: jest.fn(),
    ...overrides,
  };
}

describe('ClinicalRiskRegistry', () => {
  let registry: ClinicalRiskRegistry;

  beforeEach(() => {
    registry = new ClinicalRiskRegistry();
  });

  it('registers a model and retrieves it by category', () => {
    const model = buildModel();
    registry.register(model);

    expect(registry.get('METABOLIC')).toBe(model);
  });

  it('returns undefined for an unregistered category', () => {
    expect(registry.get('CARDIOVASCULAR')).toBeUndefined();
  });

  it('defaults priority to 0 and enabled to true', () => {
    registry.register(buildModel());

    expect(registry.list()).toEqual([
      { category: 'METABOLIC', name: 'fake-model', version: '1.0.0', priority: 0, enabled: true },
    ]);
  });

  it('honors explicit priority/enabled at registration', () => {
    registry.register(buildModel(), { priority: 5, enabled: false });

    expect(registry.list()).toEqual([
      { category: 'METABOLIC', name: 'fake-model', version: '1.0.0', priority: 5, enabled: false },
    ]);
  });

  it('listEnabled() excludes disabled models', () => {
    const enabledModel = buildModel({ category: 'METABOLIC' as ClinicalRiskModel['category'] });
    const disabledModel = buildModel({ category: 'CARDIOVASCULAR' as ClinicalRiskModel['category'] });
    registry.register(enabledModel);
    registry.register(disabledModel, { enabled: false });

    expect(registry.listEnabled()).toEqual([enabledModel]);
  });

  it('listEnabled() sorts by priority, highest first', () => {
    const low = buildModel({ category: 'METABOLIC' as ClinicalRiskModel['category'], name: 'low' });
    const high = buildModel({ category: 'CARDIOVASCULAR' as ClinicalRiskModel['category'], name: 'high' });
    registry.register(low, { priority: 1 });
    registry.register(high, { priority: 10 });

    expect(registry.listEnabled().map((m) => m.name)).toEqual(['high', 'low']);
  });

  it('setEnabled() toggles a registered model without re-registering it', () => {
    registry.register(buildModel());
    registry.setEnabled('METABOLIC', false);

    expect(registry.listEnabled()).toEqual([]);
    expect(registry.list()[0].enabled).toBe(false);
  });

  it('setEnabled() is a no-op for an unregistered category', () => {
    expect(() => registry.setEnabled('UNKNOWN', false)).not.toThrow();
  });

  it('re-registering the same category overwrites the previous entry', () => {
    registry.register(buildModel({ version: '1.0.0' }));
    registry.register(buildModel({ version: '2.0.0' }));

    expect(registry.list()).toHaveLength(1);
    expect(registry.list()[0].version).toBe('2.0.0');
  });
});

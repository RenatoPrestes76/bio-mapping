import { ClinicalRule } from '../entities/clinical-rule.entity.js';
import { ClinicalGuideline } from '../entities/clinical-guideline.entity.js';
import { ClinicalReference } from '../entities/clinical-reference.entity.js';

describe('ClinicalRule', () => {
  const base = {
    id: 'rule-1',
    category: 'CARDIOLOGY',
    condition: 'PA ≥ 140/90 mmHg',
    recommendation: 'Avaliar tratamento anti-hipertensivo',
    evidenceLevel: 'A' as const,
    priority: 1,
    source: 'SBC 2020',
  };

  it('sets all required fields', () => {
    const rule = new ClinicalRule(base);
    expect(rule.id).toBe('rule-1');
    expect(rule.category).toBe('CARDIOLOGY');
    expect(rule.condition).toBe('PA ≥ 140/90 mmHg');
    expect(rule.recommendation).toBe('Avaliar tratamento anti-hipertensivo');
    expect(rule.evidenceLevel).toBe('A');
    expect(rule.priority).toBe(1);
    expect(rule.source).toBe('SBC 2020');
  });

  it('defaults tags to empty array', () => {
    const rule = new ClinicalRule(base);
    expect(rule.tags).toEqual([]);
  });

  it('stores provided tags', () => {
    const rule = new ClinicalRule({ ...base, tags: ['hipertensão', 'cardiovascular'] });
    expect(rule.tags).toEqual(['hipertensão', 'cardiovascular']);
  });

  it('defaults createdAt to current date', () => {
    const before = new Date();
    const rule = new ClinicalRule(base);
    expect(rule.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('uses provided createdAt', () => {
    const date = new Date('2024-01-01');
    const rule = new ClinicalRule({ ...base, createdAt: date });
    expect(rule.createdAt).toBe(date);
  });

  it('matchesCondition returns true when query matches condition', () => {
    const rule = new ClinicalRule({ ...base, tags: ['hipertensão'] });
    expect(rule.matchesCondition('140')).toBe(true);
  });

  it('matchesCondition returns true when query matches recommendation', () => {
    const rule = new ClinicalRule(base);
    expect(rule.matchesCondition('anti-hipertensivo')).toBe(true);
  });

  it('matchesCondition returns true when query matches tags', () => {
    const rule = new ClinicalRule({ ...base, tags: ['cardiovascular'] });
    expect(rule.matchesCondition('cardiovascular')).toBe(true);
  });

  it('matchesCondition returns false when no match', () => {
    const rule = new ClinicalRule(base);
    expect(rule.matchesCondition('oncologia')).toBe(false);
  });

  it('matchesCondition is case-insensitive', () => {
    const rule = new ClinicalRule(base);
    expect(rule.matchesCondition('AVALIAR')).toBe(true);
  });
});

describe('ClinicalGuideline', () => {
  const base = {
    id: 'gl-1',
    title: 'Diretrizes Brasileiras de Hipertensão',
    organization: 'SBC',
    version: '2020',
    publishedAt: '2020-01-01',
  };

  it('sets all required fields', () => {
    const gl = new ClinicalGuideline(base);
    expect(gl.id).toBe('gl-1');
    expect(gl.title).toBe('Diretrizes Brasileiras de Hipertensão');
    expect(gl.organization).toBe('SBC');
    expect(gl.version).toBe('2020');
  });

  it('converts publishedAt string to Date', () => {
    const gl = new ClinicalGuideline(base);
    expect(gl.publishedAt).toBeInstanceOf(Date);
  });

  it('stores publishedAt Date directly', () => {
    const date = new Date('2020-06-15');
    const gl = new ClinicalGuideline({ ...base, publishedAt: date });
    expect(gl.publishedAt).toBe(date);
  });

  it('defaults tags to empty array', () => {
    const gl = new ClinicalGuideline(base);
    expect(gl.tags).toEqual([]);
  });

  it('stores url and metadata', () => {
    const gl = new ClinicalGuideline({ ...base, url: 'https://example.com', metadata: { lang: 'pt-BR' } });
    expect(gl.url).toBe('https://example.com');
    expect(gl.metadata).toEqual({ lang: 'pt-BR' });
  });

  it('matchesQuery returns true for title match', () => {
    const gl = new ClinicalGuideline(base);
    expect(gl.matchesQuery('Hipertensão')).toBe(true);
  });

  it('matchesQuery returns true for organization match', () => {
    const gl = new ClinicalGuideline(base);
    expect(gl.matchesQuery('SBC')).toBe(true);
  });

  it('matchesQuery returns true for tag match', () => {
    const gl = new ClinicalGuideline({ ...base, tags: ['cardiovascular'] });
    expect(gl.matchesQuery('cardiovascular')).toBe(true);
  });

  it('matchesQuery returns false when no match', () => {
    const gl = new ClinicalGuideline(base);
    expect(gl.matchesQuery('oncologia')).toBe(false);
  });
});

describe('ClinicalReference', () => {
  const base = {
    id: 'ref-1',
    title: 'Meta-análise sobre hipertensão',
    description: 'Redução de 5 mmHg com restrição de sódio',
  };

  it('sets all required fields', () => {
    const ref = new ClinicalReference(base);
    expect(ref.id).toBe('ref-1');
    expect(ref.title).toBe('Meta-análise sobre hipertensão');
    expect(ref.description).toBe('Redução de 5 mmHg com restrição de sódio');
  });

  it('defaults confidence to 1', () => {
    const ref = new ClinicalReference(base);
    expect(ref.confidence).toBe(1);
  });

  it('clamps confidence to [0, 1]', () => {
    expect(new ClinicalReference({ ...base, confidence: 1.5 }).confidence).toBe(1);
    expect(new ClinicalReference({ ...base, confidence: -0.5 }).confidence).toBe(0);
  });

  it('defaults language to pt-BR', () => {
    const ref = new ClinicalReference(base);
    expect(ref.language).toBe('pt-BR');
  });

  it('defaults tags to empty array', () => {
    const ref = new ClinicalReference(base);
    expect(ref.tags).toEqual([]);
  });

  it('stores provided tags', () => {
    const ref = new ClinicalReference({ ...base, tags: ['hipertensão', 'sódio'] });
    expect(ref.tags).toEqual(['hipertensão', 'sódio']);
  });

  it('matchesQuery returns true for title match', () => {
    const ref = new ClinicalReference(base);
    expect(ref.matchesQuery('hipertensão')).toBe(true);
  });

  it('matchesQuery returns true for description match', () => {
    const ref = new ClinicalReference(base);
    expect(ref.matchesQuery('sódio')).toBe(true);
  });

  it('matchesQuery returns true for tag match', () => {
    const ref = new ClinicalReference({ ...base, tags: ['cardiovascular'] });
    expect(ref.matchesQuery('cardiovascular')).toBe(true);
  });

  it('matchesQuery returns false when no match', () => {
    const ref = new ClinicalReference(base);
    expect(ref.matchesQuery('oncologia')).toBe(false);
  });

  it('sharedTagCount returns correct overlap', () => {
    const a = new ClinicalReference({ ...base, id: 'a', tags: ['hipertensão', 'sódio', 'cardiovascular'] });
    const b = new ClinicalReference({ ...base, id: 'b', tags: ['hipertensão', 'cardiovascular', 'diabetes'] });
    expect(a.sharedTagCount(b)).toBe(2);
  });

  it('sharedTagCount returns 0 with no overlap', () => {
    const a = new ClinicalReference({ ...base, id: 'a', tags: ['hipertensão'] });
    const b = new ClinicalReference({ ...base, id: 'b', tags: ['diabetes'] });
    expect(a.sharedTagCount(b)).toBe(0);
  });
});

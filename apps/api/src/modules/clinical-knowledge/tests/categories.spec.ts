import { ClinicalDomain, CLINICAL_DOMAINS, getDomainByName } from '../knowledge/categories.js';

describe('ClinicalDomain', () => {
  it('has 14 domains', () => {
    const domains = Object.values(ClinicalDomain);
    expect(domains).toHaveLength(14);
  });

  it('includes all required domains from spec', () => {
    const domains = Object.values(ClinicalDomain);
    expect(domains).toContain('CARDIOLOGY');
    expect(domains).toContain('ENDOCRINOLOGY');
    expect(domains).toContain('NUTRITION');
    expect(domains).toContain('EXERCISE');
    expect(domains).toContain('SLEEP');
    expect(domains).toContain('MENTAL_HEALTH');
    expect(domains).toContain('LONGEVITY');
    expect(domains).toContain('WOMENS_HEALTH');
    expect(domains).toContain('MENS_HEALTH');
    expect(domains).toContain('PEDIATRICS');
    expect(domains).toContain('GERIATRICS');
    expect(domains).toContain('METABOLISM');
    expect(domains).toContain('INFLAMMATION');
    expect(domains).toContain('IMMUNOLOGY');
  });
});

describe('CLINICAL_DOMAINS', () => {
  it('has 14 entries', () => {
    expect(CLINICAL_DOMAINS).toHaveLength(14);
  });

  it('each entry has domain, label, labelEn, description, keywords', () => {
    for (const d of CLINICAL_DOMAINS) {
      expect(d).toHaveProperty('domain');
      expect(d).toHaveProperty('label');
      expect(d).toHaveProperty('labelEn');
      expect(d).toHaveProperty('description');
      expect(d).toHaveProperty('keywords');
      expect(Array.isArray(d.keywords)).toBe(true);
      expect(d.keywords.length).toBeGreaterThan(0);
    }
  });

  it('no duplicate domain values', () => {
    const domains = CLINICAL_DOMAINS.map((d) => d.domain);
    expect(new Set(domains).size).toBe(domains.length);
  });

  it('CARDIOLOGY has Portuguese label', () => {
    const card = CLINICAL_DOMAINS.find((d) => d.domain === ClinicalDomain.CARDIOLOGY);
    expect(card?.label).toBe('Cardiologia');
  });
});

describe('getDomainByName', () => {
  it('finds by domain enum value', () => {
    const result = getDomainByName('CARDIOLOGY');
    expect(result).toBeDefined();
    expect(result?.domain).toBe(ClinicalDomain.CARDIOLOGY);
  });

  it('finds by label (case-insensitive)', () => {
    const result = getDomainByName('cardiologia');
    expect(result).toBeDefined();
    expect(result?.domain).toBe(ClinicalDomain.CARDIOLOGY);
  });

  it('returns undefined for unknown name', () => {
    const result = getDomainByName('UNKNOWN_XYZ');
    expect(result).toBeUndefined();
  });
});

import { MedicalConcept, ConceptCategory } from '../entities/medical-concept.entity.js';
import { ConceptRelation, RelationType } from '../entities/concept-relation.entity.js';
import { OntologyGraph } from '../entities/ontology-graph.entity.js';

describe('MedicalConcept', () => {
  const base = {
    id: 'c1',
    code: 'I10',
    name: 'Hipertensão',
    description: 'Pressão elevada',
    category: ConceptCategory.DISEASE,
  };

  it('sets all required fields', () => {
    const c = new MedicalConcept(base);
    expect(c.id).toBe('c1');
    expect(c.code).toBe('I10');
    expect(c.name).toBe('Hipertensão');
    expect(c.description).toBe('Pressão elevada');
    expect(c.category).toBe(ConceptCategory.DISEASE);
  });

  it('defaults synonyms to empty array', () => {
    expect(new MedicalConcept(base).synonyms).toEqual([]);
  });

  it('stores provided synonyms', () => {
    const c = new MedicalConcept({ ...base, synonyms: ['HAS', 'pressão alta'] });
    expect(c.synonyms).toEqual(['HAS', 'pressão alta']);
  });

  it('stores metadata', () => {
    const c = new MedicalConcept({ ...base, metadata: { icdCode: 'I10' } });
    expect(c.metadata?.icdCode).toBe('I10');
  });

  it('matchesQuery on name', () => {
    expect(new MedicalConcept(base).matchesQuery('Hipertensão')).toBe(true);
  });

  it('matchesQuery on code', () => {
    expect(new MedicalConcept(base).matchesQuery('I10')).toBe(true);
  });

  it('matchesQuery on description', () => {
    expect(new MedicalConcept(base).matchesQuery('elevada')).toBe(true);
  });

  it('matchesQuery on synonym', () => {
    const c = new MedicalConcept({ ...base, synonyms: ['HAS'] });
    expect(c.matchesQuery('HAS')).toBe(true);
  });

  it('matchesQuery is case-insensitive', () => {
    expect(new MedicalConcept(base).matchesQuery('HIPERTENSÃO')).toBe(true);
  });

  it('matchesQuery returns false when no match', () => {
    expect(new MedicalConcept(base).matchesQuery('oncologia')).toBe(false);
  });

  it('hasSynonym returns true for exact match (case-insensitive)', () => {
    const c = new MedicalConcept({ ...base, synonyms: ['HAS'] });
    expect(c.hasSynonym('has')).toBe(true);
  });

  it('hasSynonym returns false for non-synonym', () => {
    const c = new MedicalConcept({ ...base, synonyms: ['HAS'] });
    expect(c.hasSynonym('diabetes')).toBe(false);
  });

  it('hasSynonym returns false when synonyms empty', () => {
    expect(new MedicalConcept(base).hasSynonym('HAS')).toBe(false);
  });
});

describe('ConceptCategory enum', () => {
  it('has 14 categories', () => {
    expect(Object.values(ConceptCategory)).toHaveLength(14);
  });
  it('includes DISEASE', () => expect(ConceptCategory.DISEASE).toBe('DISEASE'));
  it('includes BIOMARKER', () => expect(ConceptCategory.BIOMARKER).toBe('BIOMARKER'));
  it('includes EXERCISE', () => expect(ConceptCategory.EXERCISE).toBe('EXERCISE'));
});

describe('ConceptRelation', () => {
  const base = {
    id: 'r1',
    sourceConcept: 'c1',
    targetConcept: 'c2',
    relationType: RelationType.CAUSES,
    weight: 0.8,
    confidence: 0.9,
  };

  it('sets all fields', () => {
    const r = new ConceptRelation(base);
    expect(r.id).toBe('r1');
    expect(r.sourceConcept).toBe('c1');
    expect(r.targetConcept).toBe('c2');
    expect(r.relationType).toBe(RelationType.CAUSES);
    expect(r.weight).toBe(0.8);
    expect(r.confidence).toBe(0.9);
  });

  it('defaults weight to 0.5', () => {
    const r = new ConceptRelation({ id: 'r2', sourceConcept: 'a', targetConcept: 'b', relationType: RelationType.RELATED_TO });
    expect(r.weight).toBe(0.5);
  });

  it('clamps weight to [0, 1]', () => {
    expect(new ConceptRelation({ ...base, weight: 1.5 }).weight).toBe(1);
    expect(new ConceptRelation({ ...base, weight: -0.5 }).weight).toBe(0);
  });

  it('clamps confidence to [0, 1]', () => {
    expect(new ConceptRelation({ ...base, confidence: 2.0 }).confidence).toBe(1);
    expect(new ConceptRelation({ ...base, confidence: -1.0 }).confidence).toBe(0);
  });

  it('isStrong returns true when weight >= 0.7', () => {
    expect(new ConceptRelation({ ...base, weight: 0.7 }).isStrong()).toBe(true);
    expect(new ConceptRelation({ ...base, weight: 0.8 }).isStrong()).toBe(true);
  });

  it('isStrong returns false when weight < 0.7', () => {
    expect(new ConceptRelation({ ...base, weight: 0.69 }).isStrong()).toBe(false);
  });

  it('isHighConfidence returns true when confidence >= 0.8', () => {
    expect(new ConceptRelation({ ...base, confidence: 0.8 }).isHighConfidence()).toBe(true);
    expect(new ConceptRelation({ ...base, confidence: 0.95 }).isHighConfidence()).toBe(true);
  });

  it('isHighConfidence returns false when confidence < 0.8', () => {
    expect(new ConceptRelation({ ...base, confidence: 0.79 }).isHighConfidence()).toBe(false);
  });

  it('score returns average of weight and confidence', () => {
    const r = new ConceptRelation({ ...base, weight: 0.8, confidence: 0.6 });
    expect(r.score()).toBeCloseTo(0.7);
  });
});

describe('RelationType enum', () => {
  it('has 10 relation types', () => {
    expect(Object.values(RelationType)).toHaveLength(10);
  });
  it('includes CAUSES', () => expect(RelationType.CAUSES).toBe('CAUSES'));
  it('includes CONTRAINDICATES', () => expect(RelationType.CONTRAINDICATES).toBe('CONTRAINDICATES'));
});

describe('OntologyGraph', () => {
  const node = new MedicalConcept({ id: 'c1', code: 'I10', name: 'Hipertensão', description: 'PA alta', category: ConceptCategory.DISEASE });
  const edge = new ConceptRelation({ id: 'r1', sourceConcept: 'c1', targetConcept: 'c2', relationType: RelationType.CAUSES });
  const base = { id: 'g1', version: '1.0.0', nodes: [node], edges: [edge] };

  it('sets required fields', () => {
    const g = new OntologyGraph(base);
    expect(g.id).toBe('g1');
    expect(g.version).toBe('1.0.0');
  });

  it('nodeCount returns nodes length', () => {
    expect(new OntologyGraph(base).nodeCount).toBe(1);
  });

  it('edgeCount returns edges length', () => {
    expect(new OntologyGraph(base).edgeCount).toBe(1);
  });

  it('defaults createdAt to now', () => {
    const before = new Date();
    const g = new OntologyGraph(base);
    expect(g.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('uses provided createdAt', () => {
    const d = new Date('2024-01-01');
    const g = new OntologyGraph({ ...base, createdAt: d });
    expect(g.createdAt).toBe(d);
  });

  it('getNodeById finds node', () => {
    const g = new OntologyGraph(base);
    expect(g.getNodeById('c1')).toBe(node);
  });

  it('getNodeById returns undefined for unknown', () => {
    expect(new OntologyGraph(base).getNodeById('unknown')).toBeUndefined();
  });

  it('getEdgesBySource filters correctly', () => {
    const g = new OntologyGraph(base);
    expect(g.getEdgesBySource('c1')).toHaveLength(1);
    expect(g.getEdgesBySource('c99')).toHaveLength(0);
  });

  it('getEdgesByTarget filters correctly', () => {
    const g = new OntologyGraph(base);
    expect(g.getEdgesByTarget('c2')).toHaveLength(1);
    expect(g.getEdgesByTarget('c1')).toHaveLength(0);
  });
});

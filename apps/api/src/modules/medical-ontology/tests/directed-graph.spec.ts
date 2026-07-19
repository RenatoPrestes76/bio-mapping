import { DirectedGraph } from '../graph/directed-graph.js';
import { MedicalConcept, ConceptCategory } from '../entities/medical-concept.entity.js';
import { ConceptRelation, RelationType } from '../entities/concept-relation.entity.js';

function makeConcept(id: string, name = id): MedicalConcept {
  return new MedicalConcept({ id, code: id.toUpperCase(), name, description: name, category: ConceptCategory.DISEASE });
}

function makeRelation(id: string, src: string, tgt: string, weight = 0.8): ConceptRelation {
  return new ConceptRelation({ id, sourceConcept: src, targetConcept: tgt, relationType: RelationType.CAUSES, weight, confidence: 0.9 });
}

describe('DirectedGraph — nodes', () => {
  let g: DirectedGraph;

  beforeEach(() => { g = new DirectedGraph(); });

  it('addNode stores concept', () => {
    const c = makeConcept('c1');
    g.addNode(c);
    expect(g.getNode('c1')).toBe(c);
  });

  it('addNode ignores duplicate', () => {
    const c1 = makeConcept('c1', 'original');
    const c2 = makeConcept('c1', 'duplicate');
    g.addNode(c1);
    g.addNode(c2);
    expect(g.getNode('c1')!.name).toBe('original');
  });

  it('hasNode returns true after addNode', () => {
    g.addNode(makeConcept('c1'));
    expect(g.hasNode('c1')).toBe(true);
  });

  it('hasNode returns false for unknown', () => {
    expect(g.hasNode('unknown')).toBe(false);
  });

  it('getNodeCount reflects added nodes', () => {
    g.addNode(makeConcept('c1'));
    g.addNode(makeConcept('c2'));
    expect(g.getNodeCount()).toBe(2);
  });

  it('getAllNodes returns all', () => {
    g.addNode(makeConcept('c1'));
    g.addNode(makeConcept('c2'));
    expect(g.getAllNodes()).toHaveLength(2);
  });
});

describe('DirectedGraph — edges', () => {
  let g: DirectedGraph;
  let c1: MedicalConcept;
  let c2: MedicalConcept;
  let r1: ConceptRelation;

  beforeEach(() => {
    g = new DirectedGraph();
    c1 = makeConcept('c1');
    c2 = makeConcept('c2');
    r1 = makeRelation('r1', 'c1', 'c2');
    g.addNode(c1);
    g.addNode(c2);
    g.addEdge(r1);
  });

  it('getTotalEdgeCount increments per addEdge', () => {
    expect(g.getTotalEdgeCount()).toBe(1);
    g.addEdge(makeRelation('r2', 'c2', 'c1'));
    expect(g.getTotalEdgeCount()).toBe(2);
  });

  it('getOutEdges returns correct edges', () => {
    expect(g.getOutEdges('c1')).toHaveLength(1);
    expect(g.getOutEdges('c1')[0]).toBe(r1);
  });

  it('getInEdges returns correct edges', () => {
    expect(g.getInEdges('c2')).toHaveLength(1);
  });

  it('getOutEdges returns empty for node with no outgoing', () => {
    expect(g.getOutEdges('c2')).toHaveLength(0);
  });

  it('getOutEdges returns empty for unknown node', () => {
    expect(g.getOutEdges('unknown')).toHaveLength(0);
  });

  it('getInEdges returns empty for unknown node', () => {
    expect(g.getInEdges('unknown')).toHaveLength(0);
  });

  it('getAllEdgesForNode (no type) returns both directions', () => {
    const all = g.getAllEdgesForNode('c1');
    expect(all).toContain(r1);
  });

  it('getAllEdgesForNode with type filters', () => {
    const r2 = new ConceptRelation({ id: 'r2', sourceConcept: 'c1', targetConcept: 'c2', relationType: RelationType.RELATED_TO });
    g.addEdge(r2);
    const filtered = g.getAllEdgesForNode('c1', RelationType.RELATED_TO);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].relationType).toBe(RelationType.RELATED_TO);
  });

  it('getAllEdges deduplicates by id', () => {
    const edges = g.getAllEdges();
    const ids = edges.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getAllEdges includes all unique edges', () => {
    g.addEdge(makeRelation('r2', 'c2', 'c1'));
    expect(g.getAllEdges()).toHaveLength(2);
  });
});

describe('DirectedGraph — clear', () => {
  it('clear resets all state', () => {
    const g = new DirectedGraph();
    g.addNode(makeConcept('c1'));
    g.addNode(makeConcept('c2'));
    g.addEdge(makeRelation('r1', 'c1', 'c2'));
    g.clear();
    expect(g.getNodeCount()).toBe(0);
    expect(g.getTotalEdgeCount()).toBe(0);
    expect(g.getAllNodes()).toHaveLength(0);
    expect(g.getAllEdges()).toHaveLength(0);
  });
});

describe('DirectedGraph — shortestPath (BFS)', () => {
  let g: DirectedGraph;

  beforeEach(() => {
    g = new DirectedGraph();
    // c1 → c2 → c3, also c1 → c4 → c3 (longer)
    ['c1', 'c2', 'c3', 'c4'].forEach((id) => g.addNode(makeConcept(id)));
    g.addEdge(makeRelation('r1', 'c1', 'c2'));
    g.addEdge(makeRelation('r2', 'c2', 'c3'));
    g.addEdge(makeRelation('r3', 'c1', 'c4'));
    g.addEdge(makeRelation('r4', 'c4', 'c3'));
  });

  it('returns null when source not in graph', () => {
    expect(g.shortestPath('unknown', 'c2')).toBeNull();
  });

  it('returns null when target not in graph', () => {
    expect(g.shortestPath('c1', 'unknown')).toBeNull();
  });

  it('same node returns single-element path, empty relations, zero weight', () => {
    const r = g.shortestPath('c1', 'c1');
    expect(r).not.toBeNull();
    expect(r!.path).toHaveLength(1);
    expect(r!.relations).toHaveLength(0);
    expect(r!.totalWeight).toBe(0);
  });

  it('finds direct path c1 → c2', () => {
    const r = g.shortestPath('c1', 'c2');
    expect(r).not.toBeNull();
    expect(r!.path.map((n) => n.id)).toEqual(['c1', 'c2']);
    expect(r!.relations).toHaveLength(1);
    expect(r!.totalWeight).toBeCloseTo(0.8);
  });

  it('finds shortest BFS path c1 → c3 (2 hops, not 3)', () => {
    const r = g.shortestPath('c1', 'c3');
    expect(r).not.toBeNull();
    expect(r!.path).toHaveLength(3);
    expect(r!.relations).toHaveLength(2);
  });

  it('returns null when no path exists', () => {
    g.addNode(makeConcept('isolated'));
    expect(g.shortestPath('c1', 'isolated')).toBeNull();
  });

  it('handles cycles without infinite loop', () => {
    // add a back-edge
    g.addEdge(makeRelation('r5', 'c3', 'c1'));
    expect(() => g.shortestPath('c1', 'c3')).not.toThrow();
  });
});

describe('DirectedGraph — expand (DFS)', () => {
  let g: DirectedGraph;

  beforeEach(() => {
    g = new DirectedGraph();
    ['a', 'b', 'c', 'd'].forEach((id) => g.addNode(makeConcept(id)));
    g.addEdge(makeRelation('r1', 'a', 'b'));
    g.addEdge(makeRelation('r2', 'b', 'c'));
    g.addEdge(makeRelation('r3', 'c', 'd'));
  });

  it('returns empty when startId not in graph', () => {
    const r = g.expand('unknown', 2);
    expect(r.concepts).toHaveLength(0);
    expect(r.relations).toHaveLength(0);
  });

  it('depth 0 returns no neighbours', () => {
    const r = g.expand('a', 0);
    expect(r.concepts).toHaveLength(0);
  });

  it('depth 1 returns immediate neighbours', () => {
    const r = g.expand('a', 1);
    expect(r.concepts.map((n) => n.id)).toContain('b');
    expect(r.concepts).toHaveLength(1);
  });

  it('depth 2 returns 2 levels of neighbours', () => {
    const r = g.expand('a', 2);
    expect(r.concepts.map((n) => n.id)).toContain('b');
    expect(r.concepts.map((n) => n.id)).toContain('c');
    expect(r.concepts).toHaveLength(2);
  });

  it('does not revisit nodes (handles diamonds)', () => {
    // a → b, a → c, b → d, c → d
    g.addEdge(makeRelation('r4', 'a', 'c'));
    g.addEdge(makeRelation('r5', 'b', 'd'));
    const r = g.expand('a', 3);
    const ids = r.concepts.map((n) => n.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

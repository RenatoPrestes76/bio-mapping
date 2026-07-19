import { Injectable } from '@nestjs/common';
import { MedicalConcept, ConceptCategory } from '../entities/medical-concept.entity.js';
import { ConceptRelation, RelationType } from '../entities/concept-relation.entity.js';
import { OntologyGraph } from '../entities/ontology-graph.entity.js';
import { DirectedGraph, ExpansionResult, ShortestPathResult } from '../graph/directed-graph.js';
import { BUILT_IN_CONCEPTS } from '../ontology/concepts.js';
import { BUILT_IN_RELATIONS } from '../ontology/relations.js';

@Injectable()
export class OntologyProvider {
  private readonly graph = new DirectedGraph();
  private readonly synonymIndex = new Map<string, string>();
  private readonly cache = new Map<string, unknown>();
  private readonly GRAPH_VERSION = '1.0.0';
  private readonly GRAPH_ID = 'bio-mapping-medical-ontology-v1';

  constructor() {
    this.loadConcepts();
    this.loadRelations();
  }

  loadConcepts(): void {
    this.graph.clear();
    this.synonymIndex.clear();
    this.cache.clear();
    for (const concept of BUILT_IN_CONCEPTS) {
      this.graph.addNode(concept);
      for (const synonym of concept.synonyms) {
        this.synonymIndex.set(synonym.toLowerCase(), concept.id);
      }
      this.synonymIndex.set(concept.code.toLowerCase(), concept.id);
      this.synonymIndex.set(concept.name.toLowerCase(), concept.id);
    }
  }

  loadRelations(): void {
    for (const relation of BUILT_IN_RELATIONS) {
      this.graph.addEdge(relation);
    }
  }

  searchConcept(query: string, category?: ConceptCategory): MedicalConcept[] {
    const cacheKey = `search:${query.toLowerCase().trim()}:${category ?? ''}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) as MedicalConcept[];

    if (!query || !query.trim()) {
      const all = category
        ? this.graph.getAllNodes().filter((n) => n.category === category)
        : this.graph.getAllNodes();
      this.cache.set(cacheKey, all);
      return all;
    }

    const results = this.graph
      .getAllNodes()
      .filter((n) => {
        if (category && n.category !== category) return false;
        return n.matchesQuery(query);
      })
      .sort((a, b) => {
        const aExact = a.name.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
        const bExact = b.name.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
        return bExact - aExact;
      });

    this.cache.set(cacheKey, results);
    return results;
  }

  findRelated(conceptId: string, type?: RelationType): { concept: MedicalConcept; relation: ConceptRelation }[] {
    const cacheKey = `related:${conceptId}:${type ?? ''}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) as ReturnType<typeof this.findRelated>;

    const edges = this.graph.getAllEdgesForNode(conceptId, type);
    const result: { concept: MedicalConcept; relation: ConceptRelation }[] = [];

    for (const edge of edges) {
      const neighborId = edge.sourceConcept === conceptId ? edge.targetConcept : edge.sourceConcept;
      const concept = this.graph.getNode(neighborId);
      if (concept) result.push({ concept, relation: edge });
    }

    const sorted = result.sort((a, b) => b.relation.score() - a.relation.score());
    this.cache.set(cacheKey, sorted);
    return sorted;
  }

  findPath(fromId: string, toId: string): ShortestPathResult | null {
    const cacheKey = `path:${fromId}:${toId}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) as ShortestPathResult | null;
    const result = this.graph.shortestPath(fromId, toId);
    this.cache.set(cacheKey, result);
    return result;
  }

  expandConcept(conceptId: string, depth = 2): ExpansionResult {
    const cacheKey = `expand:${conceptId}:${depth}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) as ExpansionResult;
    const result = this.graph.expand(conceptId, depth);
    this.cache.set(cacheKey, result);
    return result;
  }

  getConcept(idOrCode: string): MedicalConcept | undefined {
    const direct = this.graph.getNode(idOrCode);
    if (direct) return direct;
    const idFromIndex = this.synonymIndex.get(idOrCode.toLowerCase());
    return idFromIndex ? this.graph.getNode(idFromIndex) : undefined;
  }

  getGraph(limit?: number): OntologyGraph {
    const nodes = this.graph.getAllNodes();
    const edges = this.graph.getAllEdges();
    return new OntologyGraph({
      id: this.GRAPH_ID,
      version: this.GRAPH_VERSION,
      nodes: limit ? nodes.slice(0, limit) : nodes,
      edges: limit ? edges.slice(0, limit * 2) : edges,
    });
  }

  getNodeCount(): number {
    return this.graph.getNodeCount();
  }

  getEdgeCount(): number {
    return this.graph.getTotalEdgeCount();
  }

  clearCache(): void {
    this.cache.clear();
  }
}

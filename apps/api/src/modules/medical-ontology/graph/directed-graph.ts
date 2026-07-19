import { MedicalConcept } from '../entities/medical-concept.entity.js';
import { ConceptRelation, RelationType } from '../entities/concept-relation.entity.js';

export interface ShortestPathResult {
  path: MedicalConcept[];
  relations: ConceptRelation[];
  totalWeight: number;
}

export interface ExpansionResult {
  concepts: MedicalConcept[];
  relations: ConceptRelation[];
}

export class DirectedGraph {
  private readonly nodes = new Map<string, MedicalConcept>();
  private readonly outEdges = new Map<string, ConceptRelation[]>();
  private readonly inEdges = new Map<string, ConceptRelation[]>();
  private edgeCount = 0;

  addNode(concept: MedicalConcept): void {
    if (!this.nodes.has(concept.id)) {
      this.nodes.set(concept.id, concept);
      this.outEdges.set(concept.id, []);
      this.inEdges.set(concept.id, []);
    }
  }

  addEdge(relation: ConceptRelation): void {
    const src = relation.sourceConcept;
    const tgt = relation.targetConcept;
    if (!this.outEdges.has(src)) this.outEdges.set(src, []);
    if (!this.inEdges.has(tgt)) this.inEdges.set(tgt, []);
    this.outEdges.get(src)!.push(relation);
    this.inEdges.get(tgt)!.push(relation);
    this.edgeCount++;
  }

  getNode(id: string): MedicalConcept | undefined {
    return this.nodes.get(id);
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  getOutEdges(nodeId: string): ConceptRelation[] {
    return this.outEdges.get(nodeId) ?? [];
  }

  getInEdges(nodeId: string): ConceptRelation[] {
    return this.inEdges.get(nodeId) ?? [];
  }

  getAllEdgesForNode(nodeId: string, type?: RelationType): ConceptRelation[] {
    const out = this.getOutEdges(nodeId);
    const inE = this.getInEdges(nodeId);
    const all = [...out, ...inE];
    return type ? all.filter((e) => e.relationType === type) : all;
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  getTotalEdgeCount(): number {
    return this.edgeCount;
  }

  getAllNodes(): MedicalConcept[] {
    return Array.from(this.nodes.values());
  }

  getAllEdges(): ConceptRelation[] {
    const seen = new Set<string>();
    const result: ConceptRelation[] = [];
    for (const edges of this.outEdges.values()) {
      for (const e of edges) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          result.push(e);
        }
      }
    }
    return result;
  }

  shortestPath(fromId: string, toId: string): ShortestPathResult | null {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) return null;
    if (fromId === toId) {
      return { path: [this.nodes.get(fromId)!], relations: [], totalWeight: 0 };
    }

    type QueueItem = { id: string; path: MedicalConcept[]; rels: ConceptRelation[]; weight: number };
    const queue: QueueItem[] = [{ id: fromId, path: [this.nodes.get(fromId)!], rels: [], weight: 0 }];
    const visited = new Set<string>([fromId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of this.getOutEdges(current.id)) {
        if (visited.has(edge.targetConcept)) continue;
        const neighbor = this.nodes.get(edge.targetConcept);
        if (!neighbor) continue;
        const newPath = [...current.path, neighbor];
        const newRels = [...current.rels, edge];
        const newWeight = current.weight + edge.weight;
        if (edge.targetConcept === toId) {
          return { path: newPath, relations: newRels, totalWeight: newWeight };
        }
        visited.add(edge.targetConcept);
        queue.push({ id: edge.targetConcept, path: newPath, rels: newRels, weight: newWeight });
      }
    }

    return null;
  }

  expand(startId: string, maxDepth: number): ExpansionResult {
    if (!this.nodes.has(startId)) return { concepts: [], relations: [] };
    const visited = new Set<string>([startId]);
    const concepts: MedicalConcept[] = [];
    const relations: ConceptRelation[] = [];

    const dfs = (nodeId: string, depth: number): void => {
      if (depth >= maxDepth) return;
      for (const edge of this.getOutEdges(nodeId)) {
        const neighbor = this.nodes.get(edge.targetConcept);
        if (!neighbor || visited.has(edge.targetConcept)) continue;
        visited.add(edge.targetConcept);
        concepts.push(neighbor);
        relations.push(edge);
        dfs(edge.targetConcept, depth + 1);
      }
    };

    dfs(startId, 0);
    return { concepts, relations };
  }

  clear(): void {
    this.nodes.clear();
    this.outEdges.clear();
    this.inEdges.clear();
    this.edgeCount = 0;
  }
}

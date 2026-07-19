import { MedicalConcept } from './medical-concept.entity.js';
import { ConceptRelation } from './concept-relation.entity.js';

export class OntologyGraph {
  readonly id: string;
  readonly version: string;
  readonly nodes: MedicalConcept[];
  readonly edges: ConceptRelation[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: {
    id: string;
    version: string;
    nodes: MedicalConcept[];
    edges: ConceptRelation[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = data.id;
    this.version = data.version;
    this.nodes = data.nodes;
    this.edges = data.edges;
    this.createdAt = data.createdAt ?? new Date();
    this.updatedAt = data.updatedAt ?? new Date();
  }

  get nodeCount(): number {
    return this.nodes.length;
  }

  get edgeCount(): number {
    return this.edges.length;
  }

  getNodeById(id: string): MedicalConcept | undefined {
    return this.nodes.find((n) => n.id === id);
  }

  getEdgesBySource(sourceId: string): ConceptRelation[] {
    return this.edges.filter((e) => e.sourceConcept === sourceId);
  }

  getEdgesByTarget(targetId: string): ConceptRelation[] {
    return this.edges.filter((e) => e.targetConcept === targetId);
  }
}

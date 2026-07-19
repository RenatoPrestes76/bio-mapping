import { Injectable, NotFoundException } from '@nestjs/common';
import { ConceptCategory } from './entities/medical-concept.entity.js';
import { RelationType } from './entities/concept-relation.entity.js';
import { OntologyProvider } from './providers/ontology.provider.js';

@Injectable()
export class MedicalOntologyService {
  constructor(private readonly provider: OntologyProvider) {}

  search(query: string, category?: ConceptCategory) {
    return this.provider.searchConcept(query, category);
  }

  findConcept(idOrCode: string) {
    const concept = this.provider.getConcept(idOrCode);
    if (!concept) throw new NotFoundException(`Concept '${idOrCode}' not found`);
    return concept;
  }

  findRelations(conceptId: string, type?: RelationType) {
    const concept = this.provider.getConcept(conceptId);
    if (!concept) throw new NotFoundException(`Concept '${conceptId}' not found`);
    return this.provider.findRelated(conceptId, type);
  }

  findShortestPath(fromId: string, toId: string) {
    const from = this.provider.getConcept(fromId);
    if (!from) throw new NotFoundException(`Concept '${fromId}' not found`);
    const to = this.provider.getConcept(toId);
    if (!to) throw new NotFoundException(`Concept '${toId}' not found`);
    const result = this.provider.findPath(fromId, toId);
    if (!result) return { found: false, from, to, path: [], relations: [], totalWeight: 0 };
    return { found: true, from, to, ...result };
  }

  expandKnowledge(conceptId: string, depth = 2) {
    const concept = this.provider.getConcept(conceptId);
    if (!concept) throw new NotFoundException(`Concept '${conceptId}' not found`);
    const expansion = this.provider.expandConcept(conceptId, depth);
    return { root: concept, ...expansion };
  }

  getGraph(limit?: number) {
    return this.provider.getGraph(limit);
  }

  getStats() {
    return {
      nodeCount: this.provider.getNodeCount(),
      edgeCount: this.provider.getEdgeCount(),
      version: this.provider.getGraph().version,
    };
  }
}

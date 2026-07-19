import { NotFoundException } from '@nestjs/common';
import { MedicalOntologyService } from '../medical-ontology.service.js';
import { OntologyProvider } from '../providers/ontology.provider.js';
import { ConceptCategory, MedicalConcept } from '../entities/medical-concept.entity.js';
import { ConceptRelation, RelationType } from '../entities/concept-relation.entity.js';
import { OntologyGraph } from '../entities/ontology-graph.entity.js';

function mockConcept(id: string): MedicalConcept {
  return new MedicalConcept({ id, code: id, name: id, description: id, category: ConceptCategory.DISEASE });
}

function mockRelation(id: string, src: string, tgt: string): ConceptRelation {
  return new ConceptRelation({ id, sourceConcept: src, targetConcept: tgt, relationType: RelationType.CAUSES, weight: 0.8, confidence: 0.9 });
}

describe('MedicalOntologyService', () => {
  let service: MedicalOntologyService;
  let provider: jest.Mocked<OntologyProvider>;

  const conceptA = mockConcept('c1');
  const conceptB = mockConcept('c2');
  const rel = mockRelation('r1', 'c1', 'c2');

  beforeEach(() => {
    provider = {
      searchConcept: jest.fn(),
      getConcept: jest.fn(),
      findRelated: jest.fn(),
      findPath: jest.fn(),
      expandConcept: jest.fn(),
      getGraph: jest.fn(),
      getNodeCount: jest.fn(),
      getEdgeCount: jest.fn(),
      clearCache: jest.fn(),
      loadConcepts: jest.fn(),
      loadRelations: jest.fn(),
    } as unknown as jest.Mocked<OntologyProvider>;

    service = new MedicalOntologyService(provider);
  });

  describe('search', () => {
    it('delegates to provider.searchConcept', () => {
      provider.searchConcept.mockReturnValue([conceptA]);
      const result = service.search('hypertension');
      expect(provider.searchConcept).toHaveBeenCalledWith('hypertension', undefined);
      expect(result).toEqual([conceptA]);
    });

    it('passes category filter through', () => {
      provider.searchConcept.mockReturnValue([conceptA]);
      service.search('', ConceptCategory.DISEASE);
      expect(provider.searchConcept).toHaveBeenCalledWith('', ConceptCategory.DISEASE);
    });

    it('returns empty array when no results', () => {
      provider.searchConcept.mockReturnValue([]);
      expect(service.search('xyz')).toEqual([]);
    });
  });

  describe('findConcept', () => {
    it('returns concept when found', () => {
      provider.getConcept.mockReturnValue(conceptA);
      expect(service.findConcept('c1')).toBe(conceptA);
    });

    it('throws NotFoundException when not found', () => {
      provider.getConcept.mockReturnValue(undefined);
      expect(() => service.findConcept('unknown')).toThrow(NotFoundException);
    });

    it('throws with meaningful message', () => {
      provider.getConcept.mockReturnValue(undefined);
      expect(() => service.findConcept('xyz')).toThrow("Concept 'xyz' not found");
    });
  });

  describe('findRelations', () => {
    it('returns relations for found concept', () => {
      provider.getConcept.mockReturnValue(conceptA);
      provider.findRelated.mockReturnValue([{ concept: conceptB, relation: rel }]);
      const result = service.findRelations('c1');
      expect(result).toHaveLength(1);
    });

    it('passes type filter to provider', () => {
      provider.getConcept.mockReturnValue(conceptA);
      provider.findRelated.mockReturnValue([]);
      service.findRelations('c1', RelationType.CAUSES);
      expect(provider.findRelated).toHaveBeenCalledWith('c1', RelationType.CAUSES);
    });

    it('throws NotFoundException when concept not found', () => {
      provider.getConcept.mockReturnValue(undefined);
      expect(() => service.findRelations('unknown')).toThrow(NotFoundException);
    });
  });

  describe('findShortestPath', () => {
    it('throws NotFoundException when from concept not found', () => {
      provider.getConcept.mockReturnValueOnce(undefined);
      expect(() => service.findShortestPath('unknown', 'c2')).toThrow(NotFoundException);
    });

    it('throws NotFoundException when to concept not found', () => {
      provider.getConcept.mockReturnValueOnce(conceptA).mockReturnValueOnce(undefined);
      expect(() => service.findShortestPath('c1', 'unknown')).toThrow(NotFoundException);
    });

    it('returns found:true when path exists', () => {
      provider.getConcept.mockReturnValueOnce(conceptA).mockReturnValueOnce(conceptB);
      provider.findPath.mockReturnValue({ path: [conceptA, conceptB], relations: [rel], totalWeight: 0.8 });
      const result = service.findShortestPath('c1', 'c2');
      expect(result.found).toBe(true);
      expect(result.from).toBe(conceptA);
      expect(result.to).toBe(conceptB);
    });

    it('returns found:false with empty path when no path exists', () => {
      provider.getConcept.mockReturnValueOnce(conceptA).mockReturnValueOnce(conceptB);
      provider.findPath.mockReturnValue(null);
      const result = service.findShortestPath('c1', 'c2');
      expect(result.found).toBe(false);
      expect(result.path).toEqual([]);
      expect(result.relations).toEqual([]);
      expect(result.totalWeight).toBe(0);
    });
  });

  describe('expandKnowledge', () => {
    it('throws NotFoundException when concept not found', () => {
      provider.getConcept.mockReturnValue(undefined);
      expect(() => service.expandKnowledge('unknown')).toThrow(NotFoundException);
    });

    it('returns root + expansion', () => {
      provider.getConcept.mockReturnValue(conceptA);
      provider.expandConcept.mockReturnValue({ concepts: [conceptB], relations: [rel] });
      const result = service.expandKnowledge('c1', 1);
      expect(result.root).toBe(conceptA);
      expect(result.concepts).toEqual([conceptB]);
    });

    it('defaults depth to 2', () => {
      provider.getConcept.mockReturnValue(conceptA);
      provider.expandConcept.mockReturnValue({ concepts: [], relations: [] });
      service.expandKnowledge('c1');
      expect(provider.expandConcept).toHaveBeenCalledWith('c1', 2);
    });
  });

  describe('getGraph', () => {
    it('delegates to provider.getGraph', () => {
      const graph = new OntologyGraph({ id: 'g', version: '1.0.0', nodes: [], edges: [] });
      provider.getGraph.mockReturnValue(graph);
      expect(service.getGraph()).toBe(graph);
    });

    it('passes limit through', () => {
      const graph = new OntologyGraph({ id: 'g', version: '1.0.0', nodes: [], edges: [] });
      provider.getGraph.mockReturnValue(graph);
      service.getGraph(10);
      expect(provider.getGraph).toHaveBeenCalledWith(10);
    });
  });

  describe('getStats', () => {
    it('returns nodeCount, edgeCount, version', () => {
      provider.getNodeCount.mockReturnValue(35);
      provider.getEdgeCount.mockReturnValue(53);
      const graph = new OntologyGraph({ id: 'g', version: '1.0.0', nodes: [], edges: [] });
      provider.getGraph.mockReturnValue(graph);
      const stats = service.getStats();
      expect(stats.nodeCount).toBe(35);
      expect(stats.edgeCount).toBe(53);
      expect(stats.version).toBe('1.0.0');
    });
  });
});

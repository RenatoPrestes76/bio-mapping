import { MedicalOntologyController } from '../medical-ontology.controller.js';
import { MedicalOntologyService } from '../medical-ontology.service.js';
import { ConceptCategory, MedicalConcept } from '../entities/medical-concept.entity.js';
import { ConceptRelation, RelationType } from '../entities/concept-relation.entity.js';
import { OntologyGraph } from '../entities/ontology-graph.entity.js';

function mockConcept(id: string): MedicalConcept {
  return new MedicalConcept({ id, code: id, name: id, description: id, category: ConceptCategory.DISEASE });
}

function mockRelation(id: string): ConceptRelation {
  return new ConceptRelation({ id, sourceConcept: 'c1', targetConcept: 'c2', relationType: RelationType.CAUSES, weight: 0.8, confidence: 0.9 });
}

describe('MedicalOntologyController', () => {
  let controller: MedicalOntologyController;
  let service: jest.Mocked<MedicalOntologyService>;

  const conceptA = mockConcept('c1');
  const conceptB = mockConcept('c2');
  const rel = mockRelation('r1');

  beforeEach(() => {
    service = {
      search: jest.fn(),
      findConcept: jest.fn(),
      findRelations: jest.fn(),
      findShortestPath: jest.fn(),
      expandKnowledge: jest.fn(),
      getGraph: jest.fn(),
      getStats: jest.fn(),
    } as unknown as jest.Mocked<MedicalOntologyService>;

    controller = new MedicalOntologyController(service);
  });

  describe('GET /medical-ontology/search', () => {
    it('returns { concepts } with results', () => {
      service.search.mockReturnValue([conceptA]);
      const result = controller.search('hypertension', undefined);
      expect(result).toEqual({ concepts: [conceptA] });
    });

    it('delegates query and category to service.search', () => {
      service.search.mockReturnValue([]);
      controller.search('ldl', ConceptCategory.BIOMARKER);
      expect(service.search).toHaveBeenCalledWith('ldl', ConceptCategory.BIOMARKER);
    });

    it('uses empty string default when q not provided', () => {
      service.search.mockReturnValue([]);
      controller.search('', undefined);
      expect(service.search).toHaveBeenCalledWith('', undefined);
    });

    it('returns empty concepts array when no match', () => {
      service.search.mockReturnValue([]);
      expect(controller.search('xyz', undefined)).toEqual({ concepts: [] });
    });
  });

  describe('GET /medical-ontology/concepts (paginated)', () => {
    const concepts = Array.from({ length: 35 }, (_, i) => mockConcept(`c${i}`));

    beforeEach(() => {
      service.search.mockReturnValue(concepts);
    });

    it('returns paginated items with total', () => {
      const result = controller.getConcepts(undefined, '1', '20');
      expect(result.total).toBe(35);
      expect(result.items).toHaveLength(20);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('second page returns remaining items', () => {
      const result = controller.getConcepts(undefined, '2', '20');
      expect(result.items).toHaveLength(15);
      expect(result.page).toBe(2);
    });

    it('clamps limit to 100 max', () => {
      const result = controller.getConcepts(undefined, '1', '200');
      expect(result.limit).toBe(100);
    });

    it('clamps limit minimum to 1', () => {
      const result = controller.getConcepts(undefined, '1', '0');
      expect(result.limit).toBe(1);
    });

    it('clamps page minimum to 1', () => {
      const result = controller.getConcepts(undefined, '0', '20');
      expect(result.page).toBe(1);
    });

    it('passes category filter to service', () => {
      controller.getConcepts(ConceptCategory.BIOMARKER, '1', '20');
      expect(service.search).toHaveBeenCalledWith('', ConceptCategory.BIOMARKER);
    });
  });

  describe('GET /medical-ontology/relations', () => {
    it('returns { relations } array', () => {
      service.findRelations.mockReturnValue([{ concept: conceptB, relation: rel }]);
      const result = controller.getRelations('c1', undefined);
      expect(result).toEqual({ relations: [{ concept: conceptB, relation: rel }] });
    });

    it('passes conceptId and type to service', () => {
      service.findRelations.mockReturnValue([]);
      controller.getRelations('c1', RelationType.CAUSES);
      expect(service.findRelations).toHaveBeenCalledWith('c1', RelationType.CAUSES);
    });

    it('returns empty array when no relations', () => {
      service.findRelations.mockReturnValue([]);
      expect(controller.getRelations('c1', undefined)).toEqual({ relations: [] });
    });
  });

  describe('GET /medical-ontology/graph', () => {
    it('returns graph from service', () => {
      const graph = new OntologyGraph({ id: 'g', version: '1.0.0', nodes: [], edges: [] });
      service.getGraph.mockReturnValue(graph);
      expect(controller.getGraph(undefined)).toBe(graph);
    });

    it('parses string limit to number', () => {
      const graph = new OntologyGraph({ id: 'g', version: '1.0.0', nodes: [], edges: [] });
      service.getGraph.mockReturnValue(graph);
      controller.getGraph('10');
      expect(service.getGraph).toHaveBeenCalledWith(10);
    });

    it('passes undefined when limit not provided', () => {
      const graph = new OntologyGraph({ id: 'g', version: '1.0.0', nodes: [], edges: [] });
      service.getGraph.mockReturnValue(graph);
      controller.getGraph(undefined);
      expect(service.getGraph).toHaveBeenCalledWith(undefined);
    });
  });

  describe('GET /medical-ontology/path', () => {
    it('returns path result from service', () => {
      const pathResult = { found: true, from: conceptA, to: conceptB, path: [conceptA, conceptB], relations: [rel], totalWeight: 0.8 };
      service.findShortestPath.mockReturnValue(pathResult);
      const result = controller.getPath('c1', 'c2');
      expect(result).toBe(pathResult);
    });

    it('passes from and to to service.findShortestPath', () => {
      service.findShortestPath.mockReturnValue({ found: false, from: conceptA, to: conceptB, path: [], relations: [], totalWeight: 0 });
      controller.getPath('c1', 'c2');
      expect(service.findShortestPath).toHaveBeenCalledWith('c1', 'c2');
    });

    it('returns found:false when no path', () => {
      service.findShortestPath.mockReturnValue({ found: false, from: conceptA, to: conceptB, path: [], relations: [], totalWeight: 0 });
      const result = controller.getPath('c1', 'c2');
      expect(result.found).toBe(false);
    });
  });

  describe('GET /medical-ontology/stats', () => {
    it('returns stats from service', () => {
      const stats = { nodeCount: 35, edgeCount: 53, version: '1.0.0' };
      service.getStats.mockReturnValue(stats);
      expect(controller.getStats()).toBe(stats);
    });
  });

  describe('GET /medical-ontology/:id', () => {
    it('returns concept by id', () => {
      service.findConcept.mockReturnValue(conceptA);
      expect(controller.findOne('c1')).toBe(conceptA);
    });

    it('passes id to service.findConcept', () => {
      service.findConcept.mockReturnValue(conceptA);
      controller.findOne('concept-hypertension');
      expect(service.findConcept).toHaveBeenCalledWith('concept-hypertension');
    });
  });
});

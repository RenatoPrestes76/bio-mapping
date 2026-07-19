export interface ReasoningEdge {
  from: string;
  to: string;
  relationshipType: 'INCREASES_RISK' | 'DECREASES_RISK' | 'CAUSES' | 'ASSOCIATED_WITH' | 'TREATED_BY' | 'PREVENTED_BY';
  weight: number;
}

export interface ReasoningNode {
  condition: string;
  icdCode?: string;
  category: 'DISEASE' | 'RISK_FACTOR' | 'SYMPTOM' | 'INTERVENTION';
}

const NODES: ReasoningNode[] = [
  { condition: 'Hipertensão Arterial', icdCode: 'I10', category: 'DISEASE' },
  { condition: 'Diabetes Mellitus tipo 2', icdCode: 'E11', category: 'DISEASE' },
  { condition: 'Pré-diabetes', icdCode: 'R73', category: 'DISEASE' },
  { condition: 'Dislipidemia', icdCode: 'E78', category: 'DISEASE' },
  { condition: 'Obesidade', icdCode: 'E66', category: 'DISEASE' },
  { condition: 'Síndrome Metabólica', icdCode: 'E88.8', category: 'DISEASE' },
  { condition: 'Alto Risco Cardiovascular', icdCode: 'Z82.49', category: 'RISK_FACTOR' },
  { condition: 'Inflamação Crônica de Baixo Grau', icdCode: 'R79.89', category: 'DISEASE' },
  { condition: 'Hipotireoidismo', icdCode: 'E03.9', category: 'DISEASE' },
  { condition: 'Sedentarismo', icdCode: 'Z72.3', category: 'RISK_FACTOR' },
];

const EDGES: ReasoningEdge[] = [
  { from: 'Obesidade', to: 'Diabetes Mellitus tipo 2', relationshipType: 'INCREASES_RISK', weight: 0.75 },
  { from: 'Obesidade', to: 'Hipertensão Arterial', relationshipType: 'INCREASES_RISK', weight: 0.70 },
  { from: 'Obesidade', to: 'Dislipidemia', relationshipType: 'INCREASES_RISK', weight: 0.65 },
  { from: 'Obesidade', to: 'Síndrome Metabólica', relationshipType: 'CAUSES', weight: 0.80 },
  { from: 'Sedentarismo', to: 'Obesidade', relationshipType: 'INCREASES_RISK', weight: 0.70 },
  { from: 'Sedentarismo', to: 'Síndrome Metabólica', relationshipType: 'INCREASES_RISK', weight: 0.60 },
  { from: 'Sedentarismo', to: 'Alto Risco Cardiovascular', relationshipType: 'INCREASES_RISK', weight: 0.65 },
  { from: 'Diabetes Mellitus tipo 2', to: 'Alto Risco Cardiovascular', relationshipType: 'INCREASES_RISK', weight: 0.80 },
  { from: 'Hipertensão Arterial', to: 'Alto Risco Cardiovascular', relationshipType: 'INCREASES_RISK', weight: 0.75 },
  { from: 'Dislipidemia', to: 'Alto Risco Cardiovascular', relationshipType: 'INCREASES_RISK', weight: 0.75 },
  { from: 'Síndrome Metabólica', to: 'Diabetes Mellitus tipo 2', relationshipType: 'INCREASES_RISK', weight: 0.70 },
  { from: 'Síndrome Metabólica', to: 'Alto Risco Cardiovascular', relationshipType: 'INCREASES_RISK', weight: 0.72 },
  { from: 'Pré-diabetes', to: 'Diabetes Mellitus tipo 2', relationshipType: 'INCREASES_RISK', weight: 0.60 },
  { from: 'Inflamação Crônica de Baixo Grau', to: 'Alto Risco Cardiovascular', relationshipType: 'ASSOCIATED_WITH', weight: 0.60 },
  { from: 'Inflamação Crônica de Baixo Grau', to: 'Diabetes Mellitus tipo 2', relationshipType: 'ASSOCIATED_WITH', weight: 0.55 },
  { from: 'Hipotireoidismo', to: 'Dislipidemia', relationshipType: 'CAUSES', weight: 0.65 },
  { from: 'Hipotireoidismo', to: 'Síndrome Metabólica', relationshipType: 'ASSOCIATED_WITH', weight: 0.50 },
];

export class ReasoningGraph {
  private readonly nodes = new Map<string, ReasoningNode>();
  private readonly outEdges = new Map<string, ReasoningEdge[]>();

  constructor() {
    for (const node of NODES) {
      this.nodes.set(node.condition, node);
      this.outEdges.set(node.condition, []);
    }
    for (const edge of EDGES) {
      const existing = this.outEdges.get(edge.from) ?? [];
      existing.push(edge);
      this.outEdges.set(edge.from, existing);
    }
  }

  getNode(condition: string): ReasoningNode | undefined {
    return this.nodes.get(condition);
  }

  getRelatedConditions(condition: string): Array<{ condition: string; weight: number; type: string }> {
    const edges = this.outEdges.get(condition) ?? [];
    return edges.map((e) => ({
      condition: e.to,
      weight: e.weight,
      type: e.relationshipType,
    }));
  }

  getAllNodes(): ReasoningNode[] {
    return Array.from(this.nodes.values());
  }

  getAllEdges(): ReasoningEdge[] {
    return EDGES;
  }

  nodeCount(): number {
    return this.nodes.size;
  }

  edgeCount(): number {
    return EDGES.length;
  }
}

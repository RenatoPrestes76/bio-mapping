import { WeightedSumEngine } from '../engines/weighted-sum.engine';
import { PercentageEngine } from '../engines/percentage.engine';
import { RiskClassificationEngine } from '../engines/risk-classification.engine';
import { ScoringService } from '../services/scoring.service';
import type { ScoringInput } from '../engines/scoring-engine.interface';

const makeInput = (overrides: Partial<ScoringInput> = {}): ScoringInput => ({
  sections: [{ id: 's1', title: 'Seção 1', order: 0 }],
  fields: [
    { id: 'f1', sectionId: 's1', label: 'Campo 1', scoringWeight: 1, min: 0, max: 10, required: true },
    { id: 'f2', sectionId: 's1', label: 'Campo 2', scoringWeight: 2, min: 0, max: 10, required: false },
  ],
  answers: [
    { fieldId: 'f1', value: '8', score: 8 },
    { fieldId: 'f2', value: '6', score: 6 },
  ],
  ...overrides,
});

describe('WeightedSumEngine', () => {
  const engine = new WeightedSumEngine();

  it('tem nome correto', () => expect(engine.name).toBe('weighted-sum'));

  it('calcula soma ponderada corretamente', () => {
    // f1: 8*1=8, f2: 6*2=12 → total=20; max: f1: 10*1=10, f2: 10*2=20 → maxTotal=30
    const result = engine.calculate(makeInput());
    expect(result.totalScore).toBe(20);
    expect(result.maxScore).toBe(30);
    expect(result.percentage).toBe(67);
  });

  it.each([
    [100, 'Excelente', 'LOW'],
    [80,  'Excelente', 'LOW'],
    [70,  'Bom',       'LOW'],
    [60,  'Bom',       'LOW'],
    [50,  'Regular',   'MODERATE'],
    [40,  'Regular',   'MODERATE'],
    [30,  'Ruim',      'HIGH'],
    [20,  'Ruim',      'HIGH'],
    [10,  'Crítico',   'CRITICAL'],
    [0,   'Crítico',   'CRITICAL'],
  ])('classifica %d%% como "%s" risco %s', (pct, label, risk) => {
    const totalScore = pct;
    const maxScore = 100;
    const input = makeInput({
      fields: [{ id: 'f1', sectionId: 's1', label: 'F1', scoringWeight: 1, min: 0, max: maxScore, required: true }],
      answers: [{ fieldId: 'f1', value: String(totalScore), score: totalScore }],
    });
    const result = engine.calculate(input);
    expect(result.classification).toBe(label);
    expect(result.riskLevel).toBe(risk);
  });

  it('score 0 para resposta sem score', () => {
    const input = makeInput({ answers: [{ fieldId: 'f1', value: null, score: null }] });
    const result = engine.calculate(input);
    expect(result.totalScore).toBe(0);
  });

  it('retorna sectionScores com dados da seção', () => {
    const result = engine.calculate(makeInput());
    expect(result.sectionScores).toHaveLength(1);
    expect(result.sectionScores[0].sectionId).toBe('s1');
  });

  it('lida com duas seções separadas', () => {
    const input: ScoringInput = {
      sections: [
        { id: 's1', title: 'Seção 1', order: 0 },
        { id: 's2', title: 'Seção 2', order: 1 },
      ],
      fields: [
        { id: 'f1', sectionId: 's1', label: 'F1', scoringWeight: 1, min: 0, max: 10, required: true },
        { id: 'f2', sectionId: 's2', label: 'F2', scoringWeight: 1, min: 0, max: 10, required: true },
      ],
      answers: [
        { fieldId: 'f1', value: '10', score: 10 },
        { fieldId: 'f2', value: '5', score: 5 },
      ],
    };
    const result = engine.calculate(input);
    expect(result.sectionScores).toHaveLength(2);
    expect(result.totalScore).toBe(15);
    expect(result.maxScore).toBe(20);
    expect(result.percentage).toBe(75);
  });

  it('maxScore usa campo max quando disponível', () => {
    const input = makeInput({
      fields: [{ id: 'f1', sectionId: 's1', label: 'F1', scoringWeight: 1, min: 0, max: 5, required: true }],
      answers: [{ fieldId: 'f1', value: '5', score: 5 }],
    });
    const result = engine.calculate(input);
    expect(result.maxScore).toBe(5);
    expect(result.percentage).toBe(100);
  });

  it('usa max=10 como padrão quando campo max é null', () => {
    const input = makeInput({
      fields: [{ id: 'f1', sectionId: 's1', label: 'F1', scoringWeight: 1, min: null, max: null, required: true }],
      answers: [{ fieldId: 'f1', value: '10', score: 10 }],
    });
    const result = engine.calculate(input);
    expect(result.maxScore).toBe(10);
  });
});

describe('PercentageEngine', () => {
  const engine = new PercentageEngine();

  it('tem nome correto', () => expect(engine.name).toBe('percentage'));

  it('calcula percentual normalizado', () => {
    const input = makeInput({
      fields: [{ id: 'f1', sectionId: 's1', label: 'F1', scoringWeight: 1, min: 0, max: 10, required: true }],
      answers: [{ fieldId: 'f1', value: '10', score: 10 }],
    });
    const result = engine.calculate(input);
    expect(result.percentage).toBe(100);
    expect(result.maxScore).toBe(100);
  });

  it.each([
    [90, 'Ótimo',               'LOW'],
    [75, 'Bom',                 'LOW'],
    [50, 'Moderado',            'MODERATE'],
    [25, 'Abaixo do esperado',  'HIGH'],
    [0,  'Crítico',             'CRITICAL'],
  ])('classifica %d%% como "%s"', (pct, label, risk) => {
    const input = makeInput({
      fields: [{ id: 'f1', sectionId: 's1', label: 'F1', scoringWeight: 1, min: 0, max: 100, required: true }],
      answers: [{ fieldId: 'f1', value: String(pct), score: pct }],
    });
    const result = engine.calculate(input);
    expect(result.classification).toBe(label);
    expect(result.riskLevel).toBe(risk);
  });
});

describe('RiskClassificationEngine', () => {
  const engine = new RiskClassificationEngine();

  it('tem nome correto', () => expect(engine.name).toBe('risk-classification'));

  it('usa bandas padrão quando config não fornecida', () => {
    const input = makeInput({
      fields: [{ id: 'f1', sectionId: 's1', label: 'F1', scoringWeight: 1, min: 0, max: 10, required: true }],
      answers: [{ fieldId: 'f1', value: '9', score: 9 }],
    });
    const result = engine.calculate(input);
    expect(result.riskLevel).toBe('LOW');
    expect(result.classification).toBe('Sem Risco');
  });

  it('aplica bandas customizadas via config', () => {
    const input: ScoringInput = {
      sections: [{ id: 's1', title: 'S1', order: 0 }],
      fields: [{ id: 'f1', sectionId: 's1', label: 'F1', scoringWeight: 1, min: 0, max: 10, required: true }],
      answers: [{ fieldId: 'f1', value: '5', score: 5 }],
      config: {
        riskBands: [
          { label: 'Alto Risco Customizado', riskLevel: 'CRITICAL', minPercent: 0, maxPercent: 60 },
          { label: 'OK',                     riskLevel: 'LOW',      minPercent: 60, maxPercent: 101 },
        ],
      },
    };
    const result = engine.calculate(input);
    expect(result.classification).toBe('Alto Risco Customizado');
    expect(result.riskLevel).toBe('CRITICAL');
  });
});

describe('ScoringService', () => {
  let service: ScoringService;

  beforeEach(() => {
    service = new ScoringService();
  });

  it('lista os 3 engines disponíveis', () => {
    const engines = service.listEngines();
    expect(engines).toContain('weighted-sum');
    expect(engines).toContain('percentage');
    expect(engines).toContain('risk-classification');
  });

  it('usa weighted-sum por padrão para engine desconhecido', () => {
    const result = service.calculate('nao-existe', makeInput());
    expect(result.totalScore).toBeDefined();
  });

  it('delega ao WeightedSumEngine', () => {
    const result = service.calculate('weighted-sum', makeInput());
    expect(result.percentage).toBeGreaterThanOrEqual(0);
  });

  it('delega ao PercentageEngine', () => {
    const result = service.calculate('percentage', makeInput());
    expect(result.maxScore).toBe(100);
  });

  it('delega ao RiskClassificationEngine', () => {
    const result = service.calculate('risk-classification', makeInput());
    expect(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).toContain(result.riskLevel);
  });
});

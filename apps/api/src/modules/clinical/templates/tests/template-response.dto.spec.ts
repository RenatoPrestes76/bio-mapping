import { toTemplateResponse } from '../dto/template-response.dto';

const makeTemplate = (overrides: any = {}) => ({
  id: 'tpl-1',
  name: 'Template',
  description: 'Desc',
  category: 'PHYSICAL',
  version: 1,
  isActive: true,
  organizationId: null,
  createdBy: 'u1',
  scoringEngine: 'weighted-sum',
  scoringConfig: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  sections: [],
  ...overrides,
});

const makeSection = (overrides: any = {}) => ({
  id: 'sec-1',
  templateId: 'tpl-1',
  title: 'Seção 1',
  description: null,
  order: 0,
  fields: [],
  ...overrides,
});

const makeField = (overrides: any = {}) => ({
  id: 'fld-1',
  sectionId: 'sec-1',
  label: 'Campo 1',
  description: null,
  placeholder: null,
  fieldType: 'NUMBER',
  required: true,
  order: 0,
  min: 0,
  max: 10,
  unit: null,
  defaultValue: null,
  options: null,
  validationRules: null,
  scoringWeight: 1,
  ...overrides,
});

describe('toTemplateResponse', () => {
  it('mapeia template sem seções', () => {
    const result = toTemplateResponse(makeTemplate() as any);
    expect(result.id).toBe('tpl-1');
    expect(result.sections).toHaveLength(0);
    expect(result.scoringEngine).toBe('weighted-sum');
  });

  it('mapeia template com seções e campos ordenados', () => {
    const tpl = makeTemplate({
      sections: [
        makeSection({ id: 'sec-2', order: 1, fields: [makeField({ id: 'f2', order: 1 }), makeField({ id: 'f1', order: 0 })] }),
        makeSection({ id: 'sec-1', order: 0, fields: [] }),
      ],
    });
    const result = toTemplateResponse(tpl as any);

    expect(result.sections[0].id).toBe('sec-1'); // order 0 primeiro
    expect(result.sections[1].id).toBe('sec-2'); // order 1 segundo
    expect(result.sections[1].fields[0].id).toBe('f1'); // order 0 primeiro
    expect(result.sections[1].fields[1].id).toBe('f2');
  });

  it('preserva todos campos de template', () => {
    const now = new Date();
    const tpl = makeTemplate({ createdAt: now, updatedAt: now, description: 'minha desc', organizationId: 'org-1' });
    const result = toTemplateResponse(tpl as any);
    expect(result.description).toBe('minha desc');
    expect(result.organizationId).toBe('org-1');
    expect(result.createdAt).toBe(now);
    expect(result.updatedAt).toBe(now);
  });

  it('mapeia todos campos de campo (field)', () => {
    const tpl = makeTemplate({
      sections: [makeSection({ fields: [makeField({ unit: 'kg', defaultValue: '0', options: { a: 1 }, validationRules: { min: 0 } })] })],
    });
    const result = toTemplateResponse(tpl as any);
    const field = result.sections[0].fields[0];

    expect(field.unit).toBe('kg');
    expect(field.defaultValue).toBe('0');
    expect(field.options).toEqual({ a: 1 });
    expect(field.validationRules).toEqual({ min: 0 });
    expect(field.min).toBe(0);
    expect(field.max).toBe(10);
  });

  it('lida com sections undefined graciosamente', () => {
    const tpl = makeTemplate({ sections: undefined });
    const result = toTemplateResponse(tpl as any);
    expect(result.sections).toHaveLength(0);
  });

  it('lida com fields undefined em seção', () => {
    const tpl = makeTemplate({ sections: [makeSection({ fields: undefined })] });
    const result = toTemplateResponse(tpl as any);
    expect(result.sections[0].fields).toHaveLength(0);
  });
});

import type { AssessmentTemplate, AssessmentSection, AssessmentField } from '@bio/database';

export interface FieldResponseDto {
  id: string;
  sectionId: string;
  label: string;
  description: string | null;
  placeholder: string | null;
  fieldType: string;
  required: boolean;
  order: number;
  min: number | null;
  max: number | null;
  unit: string | null;
  defaultValue: string | null;
  options: unknown;
  validationRules: unknown;
  scoringWeight: number | null;
}

export interface SectionResponseDto {
  id: string;
  templateId: string;
  title: string;
  description: string | null;
  order: number;
  fields: FieldResponseDto[];
}

export interface TemplateResponseDto {
  id: string;
  name: string;
  description: string | null;
  category: string;
  version: number;
  isActive: boolean;
  organizationId: string | null;
  createdBy: string;
  scoringEngine: string;
  scoringConfig: unknown;
  sections: SectionResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

type FieldWithData = AssessmentField;
type SectionWithFields = AssessmentSection & { fields: FieldWithData[] };
type TemplateWithSections = AssessmentTemplate & { sections: SectionWithFields[] };

export function toTemplateResponse(t: TemplateWithSections): TemplateResponseDto {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    version: t.version,
    isActive: t.isActive,
    organizationId: t.organizationId,
    createdBy: t.createdBy,
    scoringEngine: t.scoringEngine,
    scoringConfig: t.scoringConfig,
    sections: (t.sections ?? [])
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        id: s.id,
        templateId: s.templateId,
        title: s.title,
        description: s.description,
        order: s.order,
        fields: (s.fields ?? [])
          .sort((a, b) => a.order - b.order)
          .map((f) => ({
            id: f.id,
            sectionId: f.sectionId,
            label: f.label,
            description: f.description,
            placeholder: f.placeholder,
            fieldType: f.fieldType,
            required: f.required,
            order: f.order,
            min: f.min,
            max: f.max,
            unit: f.unit,
            defaultValue: f.defaultValue,
            options: f.options,
            validationRules: f.validationRules,
            scoringWeight: f.scoringWeight,
          })),
      })),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

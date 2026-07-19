import { Sex, LifestyleData, BiomarkerValue } from '../entities/clinical-case.entity.js';

export class AnalyzeCaseDto {
  patientId: string = '';
  age: number = 0;
  sex: Sex = Sex.OTHER;
  conditions?: string[];
  symptoms?: string[];
  biomarkers?: BiomarkerValue[];
  medications?: string[];
  lifestyle?: LifestyleData;
  familyHistory?: string[];
}

export interface ScenarioDto {
  description?: string;
  addConditions?: string[];
  biomarkerOverrides?: BiomarkerValue[];
  lifestyleOverrides?: Partial<LifestyleData>;
}

export class SimulateCaseDto extends AnalyzeCaseDto {
  scenarios?: ScenarioDto[];
  targetCondition?: string;
}

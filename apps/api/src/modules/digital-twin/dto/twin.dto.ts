import type { ScenarioInput } from '../entities/simulation-scenario.entity.js';

export class CreateTwinDto {
  patientId: string = '';
  demographics: {
    age: number;
    sex: 'MALE' | 'FEMALE' | 'OTHER';
    bmi?: number;
    height?: number;
    weight?: number;
  } = { age: 0, sex: 'OTHER' };
  conditions?: string[];
  medications?: string[];
  symptoms?: string[];
  biomarkers?: { name: string; value: number; unit?: string }[];
  lifestyle?: {
    smoking?: boolean;
    physicalActivity?: string;
    sleepHours?: number;
    dietType?: string;
    stressLevel?: string;
  };
  familyHistory?: string[];
}

export class SimulateScenarioDto {
  twinId: string = '';
  scenarioName: string = '';
  description?: string;
  inputs: ScenarioInput[] = [];
  assumptions?: string[];
  expectedDurationWeeks?: number;
}

export class ForecastDto {
  twinId: string = '';
  horizonWeeks: number = 52;
}

export class CompareDto {
  snapshotId1: string = '';
  snapshotId2: string = '';
}

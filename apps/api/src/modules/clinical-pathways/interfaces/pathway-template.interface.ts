import { StepActionType } from '@bio/database';

export interface StepTemplate {
  sequence: number;
  title: string;
  description: string;
  actionType: StepActionType;
  dueDaysFromStart: number;
}

export interface PathwayTemplate {
  templateId: string;
  name: string;
  description: string;
  clinicalCode: string;
  priority: string;
  steps: StepTemplate[];
}

export class CreateCarePlanDto {
  patientId!: string;
  tenantId?: string;
  title?: string;
  description?: string;
  followUpDays?: number;
  goals?: Array<{
    title: string;
    description?: string;
    targetValue?: number;
    unit?: string;
    deadline?: string;
  }>;
}

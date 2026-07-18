export class CreateProfileDto {
  patientId!: string;
  tenantId?: string;
  age?: number;
  sex?: 'MALE' | 'FEMALE' | 'OTHER';
  weight?: number;
  height?: number;
  bmi?: number;
  lifestyle?: 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE' | 'ATHLETE';
  smoking?: boolean;
  alcohol?: 'NONE' | 'OCCASIONAL' | 'MODERATE' | 'HEAVY';
  pregnant?: boolean;
  menopausal?: boolean;
  familyHistory?: string[];
  conditions?: string[];
  medications?: string[];
  occupation?: string;
}

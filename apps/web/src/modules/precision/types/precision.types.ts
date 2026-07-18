export type BiologicalSex = 'MALE' | 'FEMALE' | 'OTHER';
export type LifestyleType = 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE' | 'ATHLETE';
export type AlcoholConsumption = 'NONE' | 'OCCASIONAL' | 'MODERATE' | 'HEAVY';
export type PersonalizedRiskLevel = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
export type RecommendationCategory =
  | 'NUTRITION'
  | 'EXERCISE'
  | 'MEDICATION'
  | 'MONITORING'
  | 'LIFESTYLE'
  | 'PREVENTIVE'
  | 'SPECIALIST_REFERRAL';
export type CarePlanStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';

export interface PatientProfile {
  id: string;
  patientId: string;
  tenantId: string | null;
  age: number | null;
  sex: BiologicalSex | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  lifestyle: LifestyleType | null;
  smoking: boolean;
  alcohol: AlcoholConsumption | null;
  pregnant: boolean;
  menopausal: boolean;
  familyHistory: string[] | null;
  conditions: string[] | null;
  medications: string[] | null;
  occupation: string | null;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalizedRisk {
  id: string;
  patientId: string;
  profileId: string;
  baseRiskScore: number;
  familyHistoryAdj: number;
  lifestyleAdj: number;
  trendAdj: number;
  finalRiskScore: number;
  riskLevel: PersonalizedRiskLevel;
  factors: string[] | null;
  createdAt: string;
}

export interface PersonalizedRecommendation {
  id: string;
  patientId: string;
  category: RecommendationCategory;
  priority: string;
  title: string;
  description: string;
  reason: string;
  expectedBenefit: string | null;
  personalized: boolean;
  createdAt: string;
}

export interface CarePlanGoal {
  id: string;
  carePlanId: string;
  title: string;
  description: string | null;
  targetValue: number | null;
  unit: string | null;
  deadline: string | null;
  achieved: boolean;
}

export interface CarePlan {
  id: string;
  patientId: string;
  title: string;
  description: string | null;
  status: CarePlanStatus;
  startDate: string;
  followUpDays: number;
  createdAt: string;
}

export interface LongitudinalSummary {
  metricName: string;
  min: number;
  max: number;
  latest: number;
  trend: {
    direction: 'IMPROVING' | 'STABLE' | 'WORSENING';
    slope: number;
    dataPoints: number;
    percentChange: number;
  };
  significantChange: boolean;
}

export interface TimelineResponse {
  summaries: LongitudinalSummary[];
  metrics: Array<{ id: string; metricName: string; value: number; unit: string | null; recordedAt: string }>;
}

export interface CreateProfilePayload {
  patientId: string;
  tenantId?: string;
  age?: number;
  sex?: BiologicalSex;
  weight?: number;
  height?: number;
  bmi?: number;
  lifestyle?: LifestyleType;
  smoking?: boolean;
  alcohol?: AlcoholConsumption;
  pregnant?: boolean;
  menopausal?: boolean;
  familyHistory?: string[];
  conditions?: string[];
  medications?: string[];
  occupation?: string;
}

export interface CreateCarePlanPayload {
  patientId: string;
  tenantId?: string;
  title?: string;
  description?: string;
  followUpDays?: number;
  goals?: Array<{ title: string; description?: string; targetValue?: number; unit?: string; deadline?: string }>;
}

export interface CalculateRiskPayload {
  patientId: string;
  baseRiskScore?: number;
  trendSlope?: number;
}

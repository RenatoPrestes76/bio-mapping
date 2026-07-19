import { Injectable, NotFoundException } from '@nestjs/common';
import { PersonalizedMedicineProvider } from './providers/personalized-medicine.provider.js';
import { CreateProfileDto, UpdateProfileDto, GeneratePlanDto, CompareProfilesDto } from './dto/profile.dto.js';
import { PatientProfile } from './entities/patient-profile.entity.js';
import { PersonalizedPlan } from './entities/personalized-plan.entity.js';
import { ProfileScores } from './scoring/profile-scoring.engine.js';
import { AdjustedRisk } from './scoring/risk-adjustment.engine.js';
import { PersonalizedRecommendation } from './recommendations/recommendation-personalizer.js';

export interface AnalysisResult {
  profile: PatientProfile;
  scores: ProfileScores;
  adjustedRisk: AdjustedRisk;
  recommendations: PersonalizedRecommendation[];
}

export interface ProfileComparison {
  profile1Id: string;
  profile2Id: string;
  scores1: ProfileScores;
  scores2: ProfileScores;
  delta: {
    metabolicScore: number;
    cardiovascularScore: number;
    lifestyleScore: number;
    overallRiskScore: number;
  };
  betterProfileId: string;
  insights: string[];
}

@Injectable()
export class PersonalizedMedicineService {
  constructor(private readonly provider: PersonalizedMedicineProvider) {}

  analyzeProfile(dto: CreateProfileDto): AnalysisResult {
    const profile = this.provider.buildProfile(dto);
    const scores = this.provider.calculateScores(profile);
    const adjustedRisk = this.provider.adjustRisk(profile, scores);
    const recommendations = this.provider.personalizeRecommendations(profile);
    return { profile, scores, adjustedRisk, recommendations };
  }

  generatePlan(dto: GeneratePlanDto): PersonalizedPlan {
    const profile = this.getProfileOrThrow(dto.profileId);
    return this.provider.generateCarePlan(profile, dto);
  }

  updateProfile(id: string, dto: UpdateProfileDto): AnalysisResult {
    const updated = this.provider.updateProfile(id, dto);
    if (!updated) throw new NotFoundException(`Profile '${id}' not found`);
    const scores = this.provider.calculateScores(updated);
    const adjustedRisk = this.provider.adjustRisk(updated, scores);
    const recommendations = this.provider.personalizeRecommendations(updated);
    return { profile: updated, scores, adjustedRisk, recommendations };
  }

  getProfile(id: string): PatientProfile {
    return this.getProfileOrThrow(id);
  }

  getPlan(id: string): PersonalizedPlan {
    const plan = this.provider.getPlan(id);
    if (!plan) throw new NotFoundException(`Plan '${id}' not found`);
    return plan;
  }

  calculateRisk(profileId: string): AdjustedRisk {
    const profile = this.getProfileOrThrow(profileId);
    const scores = this.provider.calculateScores(profile);
    return this.provider.adjustRisk(profile, scores);
  }

  optimizeRecommendations(profileId: string): PersonalizedRecommendation[] {
    const profile = this.getProfileOrThrow(profileId);
    return this.provider.personalizeRecommendations(profile);
  }

  compareProfiles(dto: CompareProfilesDto): ProfileComparison {
    const p1 = this.getProfileOrThrow(dto.profileId1);
    const p2 = this.getProfileOrThrow(dto.profileId2);
    const scores1 = this.provider.calculateScores(p1);
    const scores2 = this.provider.calculateScores(p2);

    const delta = {
      metabolicScore: scores2.metabolicScore - scores1.metabolicScore,
      cardiovascularScore: scores2.cardiovascularScore - scores1.cardiovascularScore,
      lifestyleScore: scores2.lifestyleScore - scores1.lifestyleScore,
      overallRiskScore: scores2.overallRiskScore - scores1.overallRiskScore,
    };

    const betterProfileId =
      scores1.overallHealthScore >= scores2.overallHealthScore ? p1.id : p2.id;

    const insights = this.buildComparisonInsights(p1, p2, scores1, scores2, delta);

    return { profile1Id: p1.id, profile2Id: p2.id, scores1, scores2, delta, betterProfileId, insights };
  }

  private getProfileOrThrow(id: string): PatientProfile {
    const profile = this.provider.getProfile(id);
    if (!profile) throw new NotFoundException(`Profile '${id}' not found`);
    return profile;
  }

  private buildComparisonInsights(
    p1: PatientProfile,
    p2: PatientProfile,
    s1: ProfileScores,
    s2: ProfileScores,
    delta: ProfileComparison['delta'],
  ): string[] {
    const insights: string[] = [];

    if (Math.abs(delta.metabolicScore) >= 10) {
      const better = delta.metabolicScore < 0 ? p2.patientId : p1.patientId;
      insights.push(`Perfil ${better} apresenta melhor saúde metabólica (diferença: ${Math.abs(delta.metabolicScore).toFixed(1)} pontos)`);
    }
    if (Math.abs(delta.cardiovascularScore) >= 10) {
      const better = delta.cardiovascularScore < 0 ? p2.patientId : p1.patientId;
      insights.push(`Perfil ${better} apresenta menor risco cardiovascular (diferença: ${Math.abs(delta.cardiovascularScore).toFixed(1)} pontos)`);
    }
    if (Math.abs(delta.lifestyleScore) >= 10) {
      const better = delta.lifestyleScore > 0 ? p2.patientId : p1.patientId;
      insights.push(`Perfil ${better} apresenta estilo de vida mais saudável (diferença: ${Math.abs(delta.lifestyleScore).toFixed(1)} pontos)`);
    }
    if (s1.overallHealthScore === s2.overallHealthScore) {
      insights.push('Perfis apresentam pontuação global de saúde equivalente');
    }

    return insights;
  }
}

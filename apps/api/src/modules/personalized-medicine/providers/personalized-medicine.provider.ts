import { Injectable } from '@nestjs/common';
import { PatientProfile } from '../entities/patient-profile.entity.js';
import { PersonalizedPlan } from '../entities/personalized-plan.entity.js';
import { ProfileBuilder } from '../profiling/profile-builder.js';
import { ProfileScoringEngine, ProfileScores } from '../scoring/profile-scoring.engine.js';
import { RiskAdjustmentEngine, AdjustedRisk } from '../scoring/risk-adjustment.engine.js';
import { RecommendationPersonalizer, PersonalizedRecommendation } from '../recommendations/recommendation-personalizer.js';
import { GoalPrioritizationEngine } from '../recommendations/goal-prioritization.engine.js';
import { LifestyleOptimizationEngine, LifestyleRecommendation } from '../engine/lifestyle-optimization.engine.js';
import { CreateProfileDto, UpdateProfileDto, GeneratePlanDto } from '../dto/profile.dto.js';

@Injectable()
export class PersonalizedMedicineProvider {
  private readonly profileStore = new Map<string, PatientProfile>();
  private readonly planStore = new Map<string, PersonalizedPlan>();

  private readonly profileBuilder = new ProfileBuilder();
  private readonly scoringEngine = new ProfileScoringEngine();
  private readonly riskEngine = new RiskAdjustmentEngine();
  private readonly personalizer = new RecommendationPersonalizer();
  private readonly goalEngine = new GoalPrioritizationEngine();
  private readonly lifestyleEngine = new LifestyleOptimizationEngine();

  buildProfile(dto: CreateProfileDto): PatientProfile {
    const profile = this.profileBuilder.build(dto);
    this.profileStore.set(profile.id, profile);
    return profile;
  }

  updateProfile(id: string, updates: UpdateProfileDto): PatientProfile | undefined {
    const existing = this.profileStore.get(id);
    if (!existing) return undefined;
    const updated = this.profileBuilder.update(existing, updates);
    this.profileStore.set(id, updated);
    return updated;
  }

  getProfile(id: string): PatientProfile | undefined {
    return this.profileStore.get(id);
  }

  calculateScores(profile: PatientProfile): ProfileScores {
    return this.scoringEngine.score(profile);
  }

  adjustRisk(profile: PatientProfile, scores: ProfileScores): AdjustedRisk {
    return this.riskEngine.adjustRisk(profile, scores);
  }

  personalizeRecommendations(profile: PatientProfile): PersonalizedRecommendation[] {
    return this.personalizer.personalize(profile);
  }

  optimizeLifestyle(profile: PatientProfile, scores: ProfileScores): LifestyleRecommendation[] {
    return this.lifestyleEngine.optimize(profile, scores);
  }

  generateCarePlan(profile: PatientProfile, dto?: GeneratePlanDto): PersonalizedPlan {
    const scores = this.scoringEngine.score(profile);
    const goals = this.goalEngine.prioritize(profile, scores);
    const recommendations = this.personalizer.personalize(profile);
    const lifestyleRecs = this.lifestyleEngine.optimize(profile, scores);
    const monitoringPlan = this.lifestyleEngine.generateMonitoringPlan(profile, scores);
    const followUp = this.lifestyleEngine.generateFollowUp(profile, scores);
    const adjustedRisk = this.riskEngine.adjustRisk(profile, scores);

    const allRecommendations = [
      ...recommendations.map((r) => r.recommendation),
      ...lifestyleRecs.map((r) => r.description),
    ];
    const seen = new Set<string>();
    const deduped = allRecommendations.filter((r) => {
      if (seen.has(r)) return false;
      seen.add(r);
      return true;
    });

    const targetConditions = dto?.targetConditions ?? [];
    const filteredGoals =
      targetConditions.length > 0
        ? goals.filter((g) =>
            targetConditions.some((tc) => g.category.toLowerCase().includes(tc.toLowerCase())),
          ).concat(goals.filter((g) =>
            !targetConditions.some((tc) => g.category.toLowerCase().includes(tc.toLowerCase())),
          ))
        : goals;

    const confidence = Math.max(0.5, 1 - scores.overallRiskScore / 200);
    const expectedOutcomes = this.buildExpectedOutcomes(profile, scores);

    const plan = new PersonalizedPlan({
      patientId: profile.patientId,
      goals: filteredGoals,
      recommendations: deduped,
      monitoringPlan,
      followUp,
      riskFactors: adjustedRisk.riskFactors,
      expectedOutcomes,
      confidence,
    });

    this.planStore.set(plan.id, plan);
    return plan;
  }

  generateFollowUp(profile: PatientProfile) {
    const scores = this.scoringEngine.score(profile);
    return this.lifestyleEngine.generateFollowUp(profile, scores);
  }

  getPlan(id: string): PersonalizedPlan | undefined {
    return this.planStore.get(id);
  }

  profileCount(): number {
    return this.profileStore.size;
  }

  planCount(): number {
    return this.planStore.size;
  }

  private buildExpectedOutcomes(profile: PatientProfile, scores: ProfileScores): string[] {
    const outcomes: string[] = [];

    if (scores.cardiovascularScore >= 40) {
      outcomes.push('Redução do risco cardiovascular em 20-35% com mudanças de estilo de vida em 12 meses');
    }
    if (scores.metabolicScore >= 40) {
      outcomes.push('Melhora de HbA1c em 0.5-1.5% e glicemia de jejum em 10-20 mg/dL em 6 meses');
    }
    if (profile.isSmoker()) {
      outcomes.push('Redução do risco cardiovascular em 50% em 1 ano após cessação do tabagismo');
    }
    if (profile.isSedentary()) {
      outcomes.push('Redução da mortalidade por todas as causas em 30-35% com atividade física regular');
    }
    const bmi = profile.computeBMI();
    if (bmi && bmi >= 30) {
      outcomes.push('Perda de 5-10% do peso corporal em 6 meses com intervenção multicomponente');
    }
    if (outcomes.length === 0) {
      outcomes.push('Manutenção do estado de saúde atual e prevenção de comorbidades futuras');
    }

    return outcomes;
  }
}

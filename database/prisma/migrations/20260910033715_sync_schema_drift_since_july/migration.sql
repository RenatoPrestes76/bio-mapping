-- CreateEnum
CREATE TYPE "ClinicalKnowledgeCategory" AS ENUM ('DISEASE', 'MEDICATION', 'LABORATORY', 'VITAL_SIGNS', 'NUTRITION', 'EXERCISE', 'LIFESTYLE', 'RISK_FACTOR', 'PROTOCOL', 'GUIDELINE', 'DIAGNOSTIC', 'THERAPEUTIC');

-- CreateEnum
CREATE TYPE "KnowledgeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "EvidenceLevel" AS ENUM ('A', 'B', 'C', 'D', 'EXPERT_OPINION');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('ALERT', 'RECOMMENDATION', 'REMINDER', 'CONTRAINDICATION', 'CARE_GAP', 'FOLLOW_UP', 'PREVENTIVE_ACTION');

-- CreateEnum
CREATE TYPE "DecisionPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "PathwayStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StepActionType" AS ENUM ('ASSESSMENT', 'LABORATORY', 'MEDICATION', 'LIFESTYLE', 'NUTRITION', 'EXERCISE', 'FOLLOW_UP', 'REFERRAL', 'EDUCATION', 'MONITORING');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('DECISION_CREATED', 'DECISION_ACKNOWLEDGED', 'DECISION_RESOLVED', 'PATHWAY_STARTED', 'PATHWAY_STEP_COMPLETED', 'PATHWAY_COMPLETED', 'PATHWAY_CANCELLED', 'INSIGHT_GENERATED', 'RECOMMENDATION_CREATED', 'RECOMMENDATION_ACCEPTED', 'RECOMMENDATION_COMPLETED', 'PREDICTION_GENERATED', 'ALERT_TRIGGERED', 'MANUAL_NOTE');

-- CreateEnum
CREATE TYPE "TimelineEventSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TrendType" AS ENUM ('IMPROVING', 'STABLE', 'WORSENING', 'FLUCTUATING', 'INSUFFICIENT_DATA');

-- CreateEnum
CREATE TYPE "TrendDirection" AS ENUM ('INCREASING', 'DECREASING', 'STABLE');

-- CreateEnum
CREATE TYPE "TrendStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ChapterType" AS ENUM ('FIRST_ASSESSMENT', 'TRANSFORMATION', 'CHALLENGE', 'COMPETITION', 'TRAINING_CYCLE', 'NUTRITION_PHASE', 'MEDICAL_FOLLOW_UP', 'ACHIEVEMENT', 'RECOVERY', 'MILESTONE');

-- CreateEnum
CREATE TYPE "ConnectionRelationshipType" AS ENUM ('FRIEND', 'COACH', 'TRAINER', 'NUTRITIONIST', 'PHYSICIAN', 'FAMILY', 'TEAMMATE');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED', 'REMOVED');

-- CreateEnum
CREATE TYPE "PrivacyVisibility" AS ENUM ('EVERYONE', 'CONNECTIONS', 'NOBODY');

-- CreateEnum
CREATE TYPE "BioCircleNotificationType" AS ENUM ('CONNECTION_REQUEST', 'CONNECTION_ACCEPTED', 'CHAPTER_SHARED', 'ACHIEVEMENT_SHARED', 'METRIC_SHARED', 'GOAL_SHARED');

-- CreateEnum
CREATE TYPE "TeamCategory" AS ENUM ('GYM', 'RUNNING', 'CYCLING', 'SWIMMING', 'TRIATHLON', 'BODYBUILDING', 'CROSSFIT', 'MARTIAL_ARTS', 'SPORTS_CLUB', 'CLINIC', 'CORPORATE_WELLNESS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TeamVisibility" AS ENUM ('PRIVATE', 'INVITE_ONLY', 'PUBLIC');

-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('OWNER', 'ADMINISTRATOR', 'COACH', 'TRAINER', 'NUTRITIONIST', 'PHYSICIAN', 'MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "TeamMemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "TeamEventType" AS ENUM ('TRAINING', 'COMPETITION', 'MEETING', 'ASSESSMENT', 'CHALLENGE', 'CONSULTATION');

-- CreateEnum
CREATE TYPE "CdsPriority" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CdsAlertType" AS ENUM ('INFORMATIVE', 'PREVENTIVE', 'IMPORTANT', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "OutcomeCategory" AS ENUM ('IMPROVED', 'STABLE', 'WORSENED', 'HOSPITALIZED', 'RESOLVED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RecommendationAdherence" AS ENUM ('FOLLOWED', 'PARTIALLY_FOLLOWED', 'IGNORED');

-- CreateEnum
CREATE TYPE "FeedbackClassification" AS ENUM ('CORRECT', 'PARTIALLY_CORRECT', 'INCORRECT', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "DriftType" AS ENUM ('DATA_DRIFT', 'CONCEPT_DRIFT', 'FEATURE_DRIFT', 'POPULATION_DRIFT');

-- CreateEnum
CREATE TYPE "FeedbackRole" AS ENUM ('PHYSICIAN', 'NUTRITIONIST', 'HEALTH_PROFESSIONAL', 'PATIENT');

-- CreateEnum
CREATE TYPE "LifestyleType" AS ENUM ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'ATHLETE');

-- CreateEnum
CREATE TYPE "AlcoholConsumption" AS ENUM ('NONE', 'OCCASIONAL', 'MODERATE', 'HEAVY');

-- CreateEnum
CREATE TYPE "BiologicalSex" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "PersonalizedRiskLevel" AS ENUM ('VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "RecommendationCategory" AS ENUM ('NUTRITION', 'EXERCISE', 'MEDICATION', 'MONITORING', 'LIFESTYLE', 'PREVENTIVE', 'SPECIALIST_REFERRAL');

-- CreateEnum
CREATE TYPE "CarePlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SimulationStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TimeHorizon" AS ENUM ('DAYS_30', 'DAYS_90', 'DAYS_180', 'YEAR_1', 'YEAR_2', 'YEAR_5');

-- CreateEnum
CREATE TYPE "ScenarioType" AS ENUM ('WEIGHT_LOSS', 'WEIGHT_GAIN', 'EXERCISE_INCREASE', 'ALCOHOL_REDUCTION', 'SMOKING_CESSATION', 'SLEEP_IMPROVEMENT', 'DIETARY_CHANGE', 'TREATMENT_ADHERENCE', 'RISK_FACTOR_REMOVAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CohortStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CohortAlertSeverity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CohortAlertType" AS ENUM ('RISK_INCREASE', 'DISEASE_GROWTH', 'ADHERENCE_DROP', 'BIOMARKER_CHANGE', 'TREND_SHIFT');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('PREVALENCE', 'INCIDENCE', 'MEAN', 'MEDIAN', 'PERCENTAGE', 'COUNT');

-- CreateEnum
CREATE TYPE "PopulationSegment" AS ENUM ('HEALTHY', 'AT_RISK', 'CHRONIC_DISEASES', 'CARDIOMETABOLIC', 'ONCOLOGY', 'MENTAL_HEALTH', 'WOMENS_HEALTH', 'SENIOR');

-- CreateTable
CREATE TABLE "clinical_knowledge" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "category" "ClinicalKnowledgeCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "clinical_code" TEXT,
    "source" TEXT,
    "evidence_level" "EvidenceLevel" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "KnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
    "tags" TEXT[],
    "metadata" JSONB,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_decisions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "decision_type" "DecisionType" NOT NULL,
    "priority" "DecisionPriority" NOT NULL,
    "status" "DecisionStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "recommendation" TEXT,
    "rationale" TEXT,
    "evidence_level" "EvidenceLevel" NOT NULL,
    "knowledge_id" TEXT,
    "trigger_data" JSONB,
    "metadata" JSONB,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_pathways" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PathwayStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" TEXT,
    "trigger_decision_id" TEXT,
    "template_id" TEXT NOT NULL,
    "clinical_code" TEXT,
    "knowledge_id" TEXT,
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "total_steps" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_pathways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_pathway_steps" (
    "id" TEXT NOT NULL,
    "pathway_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "action_type" "StepActionType" NOT NULL,
    "status" "StepStatus" NOT NULL DEFAULT 'PENDING',
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "knowledge_id" TEXT,
    "decision_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_pathway_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_timeline_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "event_type" "TimelineEventType" NOT NULL,
    "severity" "TimelineEventSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source_id" TEXT,
    "source_table" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_trends" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "trend_type" "TrendType" NOT NULL,
    "direction" "TrendDirection" NOT NULL,
    "status" "TrendStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source_module" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_trends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biobook_chapters" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "chapter_type" "ChapterType" NOT NULL,
    "cover_image" TEXT,
    "summary" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "metadata" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biobook_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_shares" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "shared_by" TEXT NOT NULL,
    "shared_with" TEXT NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bio_connections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "requester_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "relationship_type" "ConnectionRelationshipType" NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bio_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_privacy_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "discoverable_by" "PrivacyVisibility" NOT NULL DEFAULT 'EVERYONE',
    "invites_from" "PrivacyVisibility" NOT NULL DEFAULT 'EVERYONE',
    "bio_book_visible" "PrivacyVisibility" NOT NULL DEFAULT 'CONNECTIONS',
    "photos_visible" "PrivacyVisibility" NOT NULL DEFAULT 'CONNECTIONS',
    "metrics_visible" "PrivacyVisibility" NOT NULL DEFAULT 'CONNECTIONS',
    "achievements_visible" "PrivacyVisibility" NOT NULL DEFAULT 'CONNECTIONS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_privacy_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biocircle_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "BioCircleNotificationType" NOT NULL,
    "reference_id" TEXT,
    "reference_type" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biocircle_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bio_teams" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "TeamCategory" NOT NULL,
    "visibility" "TeamVisibility" NOT NULL DEFAULT 'INVITE_ONLY',
    "owner_id" TEXT NOT NULL,
    "cover_image" TEXT,
    "logo" TEXT,
    "invite_code" TEXT,
    "max_members" INTEGER,
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bio_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bio_team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "TeamMemberStatus" NOT NULL DEFAULT 'PENDING',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bio_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bio_team_events" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_type" "TeamEventType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "location" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bio_team_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cds_evaluations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "evaluated_by" TEXT,
    "priority" "CdsPriority" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "recommendation" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "evidence_level" "EvidenceLevel" NOT NULL,
    "requires_medical_review" BOOLEAN NOT NULL DEFAULT false,
    "variables" JSONB,
    "weights" JSONB,
    "rules_triggered" JSONB,
    "models_used" JSONB,
    "references" JSONB,
    "input_data" JSONB,
    "processing_time_ms" INTEGER,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cds_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cds_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conditions" JSONB NOT NULL,
    "conjunction" TEXT NOT NULL DEFAULT 'AND',
    "priority" "CdsPriority" NOT NULL,
    "recommendation" TEXT NOT NULL,
    "evidence_level" "EvidenceLevel" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cds_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cds_alerts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "evaluation_id" TEXT NOT NULL,
    "alert_type" "CdsAlertType" NOT NULL,
    "priority" "CdsPriority" NOT NULL,
    "reason" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cds_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cds_feedback" (
    "id" TEXT NOT NULL,
    "evaluation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "outcome" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cds_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_outcomes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "decision_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "follow_up_date" TIMESTAMP(3) NOT NULL,
    "outcome" "OutcomeCategory" NOT NULL,
    "validated_by" TEXT NOT NULL,
    "comments" TEXT,
    "model_version" TEXT NOT NULL DEFAULT '1.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_validations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "outcome_id" TEXT NOT NULL,
    "decision_id" TEXT NOT NULL,
    "predicted_value" TEXT NOT NULL,
    "actual_value" TEXT NOT NULL,
    "difference" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "model_version" TEXT NOT NULL DEFAULT '1.0',
    "variables" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_validations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "outcome_id" TEXT NOT NULL,
    "decision_id" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "adherence" "RecommendationAdherence" NOT NULL,
    "outcome_achieved" "OutcomeCategory" NOT NULL,
    "notes" TEXT,
    "model_version" TEXT NOT NULL DEFAULT '1.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_metrics" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "model_name" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "precision" DOUBLE PRECISION,
    "recall" DOUBLE PRECISION,
    "specificity" DOUBLE PRECISION,
    "sensitivity" DOUBLE PRECISION,
    "f1_score" DOUBLE PRECISION,
    "roc_auc" DOUBLE PRECISION,
    "calibration" DOUBLE PRECISION,
    "sample_size" INTEGER NOT NULL DEFAULT 0,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_drift_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "model_name" TEXT NOT NULL,
    "drift_type" "DriftType" NOT NULL,
    "drift_score" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "features" JSONB,
    "severity" TEXT NOT NULL DEFAULT 'MODERATE',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_drift_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_feedback" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "decision_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "FeedbackRole" NOT NULL,
    "classification" "FeedbackClassification" NOT NULL,
    "comment" TEXT,
    "suggested_action" TEXT,
    "model_version" TEXT NOT NULL DEFAULT '1.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "continuous_learning_statistics" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "total_decisions" INTEGER NOT NULL DEFAULT 0,
    "total_outcomes" INTEGER NOT NULL DEFAULT 0,
    "overall_accuracy" DOUBLE PRECISION,
    "drift_events_count" INTEGER NOT NULL DEFAULT 0,
    "feedback_count" INTEGER NOT NULL DEFAULT 0,
    "positive_outcome_rate" DOUBLE PRECISION,
    "average_confidence" DOUBLE PRECISION,
    "summary" JSONB,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "continuous_learning_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_snapshots" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "model_name" TEXT NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "outcome_stats" JSONB,
    "drift_stats" JSONB,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_profiles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "age" INTEGER,
    "sex" "BiologicalSex",
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "lifestyle" "LifestyleType" DEFAULT 'SEDENTARY',
    "smoking" BOOLEAN NOT NULL DEFAULT false,
    "alcohol" "AlcoholConsumption" NOT NULL DEFAULT 'NONE',
    "pregnant" BOOLEAN NOT NULL DEFAULT false,
    "menopausal" BOOLEAN NOT NULL DEFAULT false,
    "family_history" JSONB,
    "conditions" JSONB,
    "medications" JSONB,
    "occupation" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personalized_risks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "base_risk_score" DOUBLE PRECISION NOT NULL,
    "family_history_adj" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lifestyle_adj" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trend_adj" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "final_risk_score" DOUBLE PRECISION NOT NULL,
    "risk_level" "PersonalizedRiskLevel" NOT NULL,
    "factors" JSONB,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personalized_risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personalized_recommendations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "category" "RecommendationCategory" NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MODERATE',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expected_benefit" TEXT,
    "personalized" BOOLEAN NOT NULL DEFAULT true,
    "rules_triggered" JSONB,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personalized_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plans" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "CarePlanStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "follow_up_days" INTEGER NOT NULL DEFAULT 30,
    "success_indicators" JSONB,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plan_goals" (
    "id" TEXT NOT NULL,
    "care_plan_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_value" DOUBLE PRECISION,
    "unit" TEXT,
    "deadline" TIMESTAMP(3),
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_plan_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "longitudinal_metrics" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "longitudinal_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_ranges" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "biomarker" TEXT NOT NULL,
    "min_age" INTEGER,
    "max_age" INTEGER,
    "sex" "BiologicalSex",
    "pregnant" BOOLEAN NOT NULL DEFAULT false,
    "lower_bound" DOUBLE PRECISION,
    "upper_bound" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "source" TEXT,

    CONSTRAINT "reference_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personalization_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conditions" JSONB NOT NULL,
    "conjunction" TEXT NOT NULL DEFAULT 'AND',
    "action" TEXT NOT NULL,
    "action_payload" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personalization_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_twins" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "twin_version" TEXT NOT NULL DEFAULT '1.0',
    "demographics" JSONB NOT NULL,
    "clinical_history" JSONB,
    "biomarkers" JSONB,
    "risk_factors" JSONB,
    "lifestyle" JSONB,
    "longitudinal_data" JSONB,
    "active_recommendations" JSONB,
    "data_completeness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "missing_fields" JSONB,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_twins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_runs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "twin_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "scenario_type" "ScenarioType" NOT NULL,
    "scenario_label" TEXT NOT NULL,
    "time_horizon" "TimeHorizon" NOT NULL,
    "status" "SimulationStatus" NOT NULL DEFAULT 'COMPLETED',
    "model_version" TEXT NOT NULL DEFAULT '1.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_parameters" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "parameter_key" TEXT NOT NULL,
    "parameter_value" TEXT NOT NULL,
    "unit" TEXT,

    CONSTRAINT "simulation_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_results" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "baseline_risk_score" DOUBLE PRECISION NOT NULL,
    "simulated_risk_score" DOUBLE PRECISION NOT NULL,
    "expected_risk_variation" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "baseline_risk_level" TEXT NOT NULL,
    "simulated_risk_level" TEXT NOT NULL,
    "top_factors" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_assumptions" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" TEXT,

    CONSTRAINT "simulation_assumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_history" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "scenario_type" "ScenarioType" NOT NULL,
    "description" TEXT NOT NULL,
    "default_parameters" JSONB NOT NULL,
    "assumptions" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenario_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "population_cohorts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "segment" "PopulationSegment",
    "status" "CohortStatus" NOT NULL DEFAULT 'DRAFT',
    "patient_count" INTEGER NOT NULL DEFAULT 0,
    "filters" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "population_cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohort_filters" (
    "id" TEXT NOT NULL,
    "cohort_id" TEXT NOT NULL,
    "filter_key" TEXT NOT NULL,
    "filter_operator" TEXT NOT NULL,
    "filter_value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cohort_filters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohort_members" (
    "id" TEXT NOT NULL,
    "cohort_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "cohort_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "population_metrics" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "cohort_id" TEXT,
    "metric_type" "MetricType" NOT NULL,
    "metric_key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "population_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "population_trends" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "cohort_id" TEXT,
    "metric_key" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "change_percent" DOUBLE PRECISION NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "is_significant" BOOLEAN NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "population_trends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "population_alerts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "cohort_id" TEXT,
    "alert_type" "CohortAlertType" NOT NULL,
    "severity" "CohortAlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metric_key" TEXT,
    "current_value" DOUBLE PRECISION,
    "previous_value" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "acknowledged_at" TIMESTAMP(3),
    "acknowledged_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "population_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_results" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "cohort_a_id" TEXT NOT NULL,
    "cohort_b_id" TEXT,
    "benchmark_key" TEXT NOT NULL,
    "value_a" DOUBLE PRECISION NOT NULL,
    "value_b" DOUBLE PRECISION,
    "difference" DOUBLE PRECISION,
    "percent_diff" DOUBLE PRECISION,
    "period" TEXT NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benchmark_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "epidemiological_statistics" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "cohort_id" TEXT,
    "stat_key" TEXT NOT NULL,
    "stat_value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "confidence_interval" JSONB,
    "sample_size" INTEGER NOT NULL,
    "suppressed" BOOLEAN NOT NULL DEFAULT false,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "epidemiological_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinical_knowledge_category_idx" ON "clinical_knowledge"("category");

-- CreateIndex
CREATE INDEX "clinical_knowledge_status_idx" ON "clinical_knowledge"("status");

-- CreateIndex
CREATE INDEX "clinical_knowledge_evidence_level_idx" ON "clinical_knowledge"("evidence_level");

-- CreateIndex
CREATE INDEX "clinical_knowledge_tenant_id_idx" ON "clinical_knowledge"("tenant_id");

-- CreateIndex
CREATE INDEX "clinical_knowledge_clinical_code_idx" ON "clinical_knowledge"("clinical_code");

-- CreateIndex
CREATE INDEX "clinical_decisions_patient_id_idx" ON "clinical_decisions"("patient_id");

-- CreateIndex
CREATE INDEX "clinical_decisions_status_idx" ON "clinical_decisions"("status");

-- CreateIndex
CREATE INDEX "clinical_decisions_rule_id_idx" ON "clinical_decisions"("rule_id");

-- CreateIndex
CREATE INDEX "clinical_decisions_tenant_id_idx" ON "clinical_decisions"("tenant_id");

-- CreateIndex
CREATE INDEX "clinical_decisions_decision_type_idx" ON "clinical_decisions"("decision_type");

-- CreateIndex
CREATE INDEX "clinical_decisions_priority_idx" ON "clinical_decisions"("priority");

-- CreateIndex
CREATE INDEX "clinical_decisions_patient_id_rule_id_status_idx" ON "clinical_decisions"("patient_id", "rule_id", "status");

-- CreateIndex
CREATE INDEX "clinical_pathways_patient_id_idx" ON "clinical_pathways"("patient_id");

-- CreateIndex
CREATE INDEX "clinical_pathways_status_idx" ON "clinical_pathways"("status");

-- CreateIndex
CREATE INDEX "clinical_pathways_tenant_id_idx" ON "clinical_pathways"("tenant_id");

-- CreateIndex
CREATE INDEX "clinical_pathways_template_id_idx" ON "clinical_pathways"("template_id");

-- CreateIndex
CREATE INDEX "clinical_pathways_patient_id_template_id_status_idx" ON "clinical_pathways"("patient_id", "template_id", "status");

-- CreateIndex
CREATE INDEX "clinical_pathway_steps_pathway_id_idx" ON "clinical_pathway_steps"("pathway_id");

-- CreateIndex
CREATE INDEX "clinical_pathway_steps_status_idx" ON "clinical_pathway_steps"("status");

-- CreateIndex
CREATE INDEX "clinical_pathway_steps_sequence_idx" ON "clinical_pathway_steps"("sequence");

-- CreateIndex
CREATE INDEX "patient_timeline_events_patient_id_occurred_at_idx" ON "patient_timeline_events"("patient_id", "occurred_at");

-- CreateIndex
CREATE INDEX "patient_timeline_events_patient_id_event_type_idx" ON "patient_timeline_events"("patient_id", "event_type");

-- CreateIndex
CREATE INDEX "patient_timeline_events_patient_id_severity_idx" ON "patient_timeline_events"("patient_id", "severity");

-- CreateIndex
CREATE INDEX "clinical_trends_patient_id_metric_idx" ON "clinical_trends"("patient_id", "metric");

-- CreateIndex
CREATE INDEX "clinical_trends_patient_id_status_idx" ON "clinical_trends"("patient_id", "status");

-- CreateIndex
CREATE INDEX "clinical_trends_patient_id_trend_type_idx" ON "clinical_trends"("patient_id", "trend_type");

-- CreateIndex
CREATE INDEX "clinical_trends_tenant_id_idx" ON "clinical_trends"("tenant_id");

-- CreateIndex
CREATE INDEX "biobook_chapters_user_id_start_date_idx" ON "biobook_chapters"("user_id", "start_date");

-- CreateIndex
CREATE INDEX "biobook_chapters_user_id_chapter_type_idx" ON "biobook_chapters"("user_id", "chapter_type");

-- CreateIndex
CREATE INDEX "chapter_shares_chapter_id_idx" ON "chapter_shares"("chapter_id");

-- CreateIndex
CREATE INDEX "chapter_shares_shared_with_idx" ON "chapter_shares"("shared_with");

-- CreateIndex
CREATE INDEX "bio_connections_requester_id_status_idx" ON "bio_connections"("requester_id", "status");

-- CreateIndex
CREATE INDEX "bio_connections_receiver_id_status_idx" ON "bio_connections"("receiver_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bio_connections_requester_id_receiver_id_key" ON "bio_connections"("requester_id", "receiver_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_privacy_settings_user_id_key" ON "user_privacy_settings"("user_id");

-- CreateIndex
CREATE INDEX "biocircle_notifications_user_id_read_idx" ON "biocircle_notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "biocircle_notifications_user_id_created_at_idx" ON "biocircle_notifications"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "bio_teams_invite_code_key" ON "bio_teams"("invite_code");

-- CreateIndex
CREATE INDEX "bio_teams_owner_id_idx" ON "bio_teams"("owner_id");

-- CreateIndex
CREATE INDEX "bio_teams_category_idx" ON "bio_teams"("category");

-- CreateIndex
CREATE INDEX "bio_teams_visibility_idx" ON "bio_teams"("visibility");

-- CreateIndex
CREATE INDEX "bio_team_members_team_id_status_idx" ON "bio_team_members"("team_id", "status");

-- CreateIndex
CREATE INDEX "bio_team_members_user_id_status_idx" ON "bio_team_members"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bio_team_members_team_id_user_id_key" ON "bio_team_members"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "bio_team_events_team_id_start_date_idx" ON "bio_team_events"("team_id", "start_date");

-- CreateIndex
CREATE INDEX "bio_team_events_team_id_event_type_idx" ON "bio_team_events"("team_id", "event_type");

-- CreateIndex
CREATE INDEX "cds_evaluations_patient_id_created_at_idx" ON "cds_evaluations"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "cds_evaluations_patient_id_priority_idx" ON "cds_evaluations"("patient_id", "priority");

-- CreateIndex
CREATE INDEX "cds_evaluations_tenant_id_created_at_idx" ON "cds_evaluations"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "cds_rules_active_idx" ON "cds_rules"("active");

-- CreateIndex
CREATE INDEX "cds_rules_priority_idx" ON "cds_rules"("priority");

-- CreateIndex
CREATE INDEX "cds_rules_tenant_id_active_idx" ON "cds_rules"("tenant_id", "active");

-- CreateIndex
CREATE INDEX "cds_alerts_patient_id_read_idx" ON "cds_alerts"("patient_id", "read");

-- CreateIndex
CREATE INDEX "cds_alerts_patient_id_created_at_idx" ON "cds_alerts"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "cds_alerts_evaluation_id_idx" ON "cds_alerts"("evaluation_id");

-- CreateIndex
CREATE INDEX "cds_feedback_evaluation_id_idx" ON "cds_feedback"("evaluation_id");

-- CreateIndex
CREATE INDEX "clinical_outcomes_decision_id_idx" ON "clinical_outcomes"("decision_id");

-- CreateIndex
CREATE INDEX "clinical_outcomes_patient_id_created_at_idx" ON "clinical_outcomes"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "clinical_outcomes_tenant_id_outcome_idx" ON "clinical_outcomes"("tenant_id", "outcome");

-- CreateIndex
CREATE INDEX "prediction_validations_decision_id_idx" ON "prediction_validations"("decision_id");

-- CreateIndex
CREATE INDEX "prediction_validations_outcome_id_idx" ON "prediction_validations"("outcome_id");

-- CreateIndex
CREATE INDEX "prediction_validations_tenant_id_created_at_idx" ON "prediction_validations"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "recommendation_validations_decision_id_idx" ON "recommendation_validations"("decision_id");

-- CreateIndex
CREATE INDEX "recommendation_validations_tenant_id_adherence_idx" ON "recommendation_validations"("tenant_id", "adherence");

-- CreateIndex
CREATE INDEX "model_metrics_model_name_computed_at_idx" ON "model_metrics"("model_name", "computed_at");

-- CreateIndex
CREATE INDEX "model_metrics_tenant_id_computed_at_idx" ON "model_metrics"("tenant_id", "computed_at");

-- CreateIndex
CREATE INDEX "model_drift_events_model_name_created_at_idx" ON "model_drift_events"("model_name", "created_at");

-- CreateIndex
CREATE INDEX "model_drift_events_tenant_id_resolved_idx" ON "model_drift_events"("tenant_id", "resolved");

-- CreateIndex
CREATE INDEX "model_drift_events_drift_type_resolved_idx" ON "model_drift_events"("drift_type", "resolved");

-- CreateIndex
CREATE INDEX "learning_feedback_decision_id_idx" ON "learning_feedback"("decision_id");

-- CreateIndex
CREATE INDEX "learning_feedback_user_id_created_at_idx" ON "learning_feedback"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "learning_feedback_tenant_id_classification_idx" ON "learning_feedback"("tenant_id", "classification");

-- CreateIndex
CREATE INDEX "continuous_learning_statistics_tenant_id_period_start_idx" ON "continuous_learning_statistics"("tenant_id", "period_start");

-- CreateIndex
CREATE INDEX "performance_snapshots_model_name_snapshot_date_idx" ON "performance_snapshots"("model_name", "snapshot_date");

-- CreateIndex
CREATE INDEX "performance_snapshots_tenant_id_snapshot_date_idx" ON "performance_snapshots"("tenant_id", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_patient_id_key" ON "patient_profiles"("patient_id");

-- CreateIndex
CREATE INDEX "patient_profiles_patient_id_idx" ON "patient_profiles"("patient_id");

-- CreateIndex
CREATE INDEX "patient_profiles_tenant_id_idx" ON "patient_profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "personalized_risks_patient_id_created_at_idx" ON "personalized_risks"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "personalized_risks_tenant_id_risk_level_idx" ON "personalized_risks"("tenant_id", "risk_level");

-- CreateIndex
CREATE INDEX "personalized_recommendations_patient_id_category_idx" ON "personalized_recommendations"("patient_id", "category");

-- CreateIndex
CREATE INDEX "personalized_recommendations_tenant_id_priority_idx" ON "personalized_recommendations"("tenant_id", "priority");

-- CreateIndex
CREATE INDEX "care_plans_patient_id_status_idx" ON "care_plans"("patient_id", "status");

-- CreateIndex
CREATE INDEX "care_plans_tenant_id_created_at_idx" ON "care_plans"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "care_plan_goals_care_plan_id_idx" ON "care_plan_goals"("care_plan_id");

-- CreateIndex
CREATE INDEX "longitudinal_metrics_patient_id_metric_name_recorded_at_idx" ON "longitudinal_metrics"("patient_id", "metric_name", "recorded_at");

-- CreateIndex
CREATE INDEX "longitudinal_metrics_tenant_id_metric_name_idx" ON "longitudinal_metrics"("tenant_id", "metric_name");

-- CreateIndex
CREATE INDEX "reference_ranges_biomarker_idx" ON "reference_ranges"("biomarker");

-- CreateIndex
CREATE INDEX "reference_ranges_tenant_id_biomarker_idx" ON "reference_ranges"("tenant_id", "biomarker");

-- CreateIndex
CREATE INDEX "personalization_rules_active_priority_idx" ON "personalization_rules"("active", "priority");

-- CreateIndex
CREATE INDEX "personalization_rules_tenant_id_active_idx" ON "personalization_rules"("tenant_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "digital_twins_patient_id_key" ON "digital_twins"("patient_id");

-- CreateIndex
CREATE INDEX "digital_twins_tenant_id_patient_id_idx" ON "digital_twins"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "simulation_runs_patient_id_created_at_idx" ON "simulation_runs"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "simulation_runs_tenant_id_created_at_idx" ON "simulation_runs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "simulation_parameters_run_id_idx" ON "simulation_parameters"("run_id");

-- CreateIndex
CREATE UNIQUE INDEX "simulation_results_run_id_key" ON "simulation_results"("run_id");

-- CreateIndex
CREATE INDEX "simulation_assumptions_run_id_idx" ON "simulation_assumptions"("run_id");

-- CreateIndex
CREATE INDEX "simulation_history_patient_id_created_at_idx" ON "simulation_history"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "simulation_history_tenant_id_created_at_idx" ON "simulation_history"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "scenario_templates_active_scenario_type_idx" ON "scenario_templates"("active", "scenario_type");

-- CreateIndex
CREATE INDEX "population_cohorts_tenant_id_status_idx" ON "population_cohorts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "population_cohorts_tenant_id_segment_idx" ON "population_cohorts"("tenant_id", "segment");

-- CreateIndex
CREATE INDEX "cohort_filters_cohort_id_idx" ON "cohort_filters"("cohort_id");

-- CreateIndex
CREATE INDEX "cohort_members_cohort_id_idx" ON "cohort_members"("cohort_id");

-- CreateIndex
CREATE UNIQUE INDEX "cohort_members_cohort_id_patient_id_key" ON "cohort_members"("cohort_id", "patient_id");

-- CreateIndex
CREATE INDEX "population_metrics_tenant_id_metric_key_idx" ON "population_metrics"("tenant_id", "metric_key");

-- CreateIndex
CREATE INDEX "population_metrics_cohort_id_metric_key_idx" ON "population_metrics"("cohort_id", "metric_key");

-- CreateIndex
CREATE INDEX "population_trends_tenant_id_metric_key_idx" ON "population_trends"("tenant_id", "metric_key");

-- CreateIndex
CREATE INDEX "population_trends_cohort_id_idx" ON "population_trends"("cohort_id");

-- CreateIndex
CREATE INDEX "population_alerts_tenant_id_is_active_idx" ON "population_alerts"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "population_alerts_tenant_id_severity_idx" ON "population_alerts"("tenant_id", "severity");

-- CreateIndex
CREATE INDEX "benchmark_results_tenant_id_cohort_a_id_idx" ON "benchmark_results"("tenant_id", "cohort_a_id");

-- CreateIndex
CREATE INDEX "epidemiological_statistics_tenant_id_stat_key_idx" ON "epidemiological_statistics"("tenant_id", "stat_key");

-- CreateIndex
CREATE INDEX "epidemiological_statistics_cohort_id_idx" ON "epidemiological_statistics"("cohort_id");

-- AddForeignKey
ALTER TABLE "clinical_pathway_steps" ADD CONSTRAINT "clinical_pathway_steps_pathway_id_fkey" FOREIGN KEY ("pathway_id") REFERENCES "clinical_pathways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_filters" ADD CONSTRAINT "cohort_filters_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "population_cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_members" ADD CONSTRAINT "cohort_members_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "population_cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "population_metrics" ADD CONSTRAINT "population_metrics_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "population_cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "population_trends" ADD CONSTRAINT "population_trends_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "population_cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "population_alerts" ADD CONSTRAINT "population_alerts_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "population_cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_results" ADD CONSTRAINT "benchmark_results_cohort_a_id_fkey" FOREIGN KEY ("cohort_a_id") REFERENCES "population_cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_results" ADD CONSTRAINT "benchmark_results_cohort_b_id_fkey" FOREIGN KEY ("cohort_b_id") REFERENCES "population_cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "epidemiological_statistics" ADD CONSTRAINT "epidemiological_statistics_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "population_cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

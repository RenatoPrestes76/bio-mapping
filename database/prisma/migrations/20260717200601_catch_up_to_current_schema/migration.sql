-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING');

-- CreateEnum
CREATE TYPE "Specialty" AS ENUM ('DOCTOR', 'NUTRITIONIST', 'PHYSICAL_EDUCATOR', 'PHYSIOTHERAPIST', 'BIOMEDICAL', 'PSYCHOLOGIST', 'NURSE', 'COACH', 'OTHER');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('CLINIC', 'GYM', 'COMPANY', 'HOSPITAL', 'INSURER', 'CORPORATE', 'OTHER');

-- CreateEnum
CREATE TYPE "OrganizationPlan" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'PROFESSIONAL', 'ASSISTANT', 'PATIENT', 'AUDITOR');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VitalSource" AS ENUM ('MANUAL', 'BLUETOOTH', 'IMPORT', 'API');

-- CreateEnum
CREATE TYPE "VitalStatus" AS ENUM ('DRAFT', 'VALIDATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BiomarkerStatus" AS ENUM ('NORMAL', 'HIGH', 'LOW', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MeasurementStatus" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('BLE', 'USB', 'WIFI', 'API', 'MANUAL');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('DISCOVERED', 'PAIRED', 'CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "DeviceSessionStatus" AS ENUM ('ACTIVE', 'ENDED', 'ERROR');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'VALIDATED', 'LOCKED');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('PHYSICAL', 'NUTRITIONAL', 'CLINICAL', 'FUNCTIONAL', 'POSTURAL', 'CARDIOVASCULAR', 'RESPIRATORY', 'PSYCHOLOGICAL', 'SPORTS_PERFORMANCE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'DECIMAL', 'BOOLEAN', 'DATE', 'TIME', 'SELECT', 'MULTISELECT', 'RADIO', 'CHECKBOX', 'SLIDER', 'FILE', 'PHOTO');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('PHOTO', 'PDF', 'VIDEO', 'AUDIO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('ELEVATED_HEART_RATE', 'PERFORMANCE_DROP', 'INSUFFICIENT_RECOVERY', 'RAPID_WEIGHT_GAIN', 'PROLONGED_SEDENTARISM', 'SLEEP_DEFICIT', 'OVERTRAINING', 'BLOOD_PRESSURE_CONCERN', 'GLUCOSE_CONCERN', 'ACTIVITY_DROP', 'PERSISTENT_SLEEP_DECLINE', 'HR_ELEVATION_TREND', 'TRAINING_OVERLOAD', 'SYNC_ABSENCE');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('RUNNING', 'CYCLING', 'SWIMMING', 'STRENGTH', 'OTHER');

-- CreateEnum
CREATE TYPE "HealthPlatform" AS ENUM ('APPLE_HEALTH', 'GOOGLE_FIT', 'GOOGLE_HEALTH_CONNECT', 'GARMIN', 'POLAR', 'FITBIT', 'AMAZFIT', 'SAMSUNG_HEALTH', 'SIMULATOR');

-- CreateEnum
CREATE TYPE "HealthSourceStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'PENDING', 'ERROR', 'REVOKED');

-- CreateEnum
CREATE TYPE "OracleSyncStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "OracleMetricType" AS ENUM ('HEART_RATE', 'HRV', 'STEPS', 'CALORIES', 'SLEEP', 'WEIGHT', 'BODY_FAT', 'SPO2', 'BLOOD_PRESSURE', 'TEMPERATURE');

-- CreateEnum
CREATE TYPE "InsightPriority" AS ENUM ('INFORMATIVO', 'ATENCAO', 'IMPORTANTE', 'ALTA_PRIORIDADE');

-- CreateEnum
CREATE TYPE "InsightCategory" AS ENUM ('SLEEP', 'HEART_RATE', 'HRV', 'TRAINING_LOAD', 'ACTIVITY', 'WEIGHT', 'BODY_COMPOSITION', 'RECOVERY', 'CARDIOVASCULAR');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IGNORED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('DAILY_STEPS', 'WEEKLY_TRAINING_SESSIONS', 'SLEEP_DURATION', 'WEIGHT', 'BODY_FAT', 'RESTING_HR', 'HRV', 'WEEKLY_CALORIES');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProgramCategory" AS ENUM ('WEIGHT_LOSS', 'HYPERTENSION', 'DIABETES', 'RUNNING_5K', 'RUNNING_10K', 'MARATHON', 'REHABILITATION', 'PREGNANCY', 'CORPORATE_HEALTH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'ACHIEVED', 'MISSED');

-- CreateEnum
CREATE TYPE "TaskRecurrence" AS ENUM ('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'SKIPPED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ClinicalRecordType" AS ENUM ('OBSERVATION', 'VITAL_SIGN', 'LABORATORY', 'MEDICATION_STATEMENT', 'ALLERGY', 'PROCEDURE', 'DIAGNOSIS', 'IMMUNIZATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ClinicalStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RESOLVED', 'CANCELLED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InteropJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "InteropDirection" AS ENUM ('IMPORT', 'EXPORT');

-- CreateEnum
CREATE TYPE "InteropAdapter" AS ENUM ('FHIR_R4', 'HL7_V2', 'CSV', 'JSON_GENERIC', 'CUSTOM');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'DOCTOR', 'PROFESSIONAL', 'PATIENT');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'PATIENT';
COMMIT;

-- AlterTable
ALTER TABLE "biological_profiles" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "last_login" TIMESTAMP(3),
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "role" SET DEFAULT 'PATIENT';

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "cpf" TEXT,
    "birth_date" DATE,
    "gender" "Gender",
    "phone" TEXT,
    "photo" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'BR',
    "zipcode" TEXT,
    "timezone" TEXT DEFAULT 'America/Sao_Paulo',
    "language" TEXT DEFAULT 'pt-BR',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professionals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "specialty" "Specialty" NOT NULL,
    "license_number" TEXT,
    "license_state" TEXT,
    "institution" TEXT,
    "bio" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "registration_code" TEXT,
    "blood_type" "BloodType",
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "primary_professional_id" TEXT,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL DEFAULT 'OTHER',
    "document" TEXT,
    "logo" TEXT,
    "plan" "OrganizationPlan" NOT NULL DEFAULT 'FREE',
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "max_users" INTEGER,
    "max_branches" INTEGER,
    "api_calls_monthly" INTEGER,
    "sso_enabled" BOOLEAN NOT NULL DEFAULT false,
    "sso_provider" TEXT,
    "sso_config" JSONB,
    "allowed_domains" TEXT[],
    "webhook_url" TEXT,
    "notify_on_login" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "role" "MembershipRole" NOT NULL,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "organization_id" TEXT,
    "action" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_records" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "professional_id" TEXT,
    "organization_id" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "source" "VitalSource" NOT NULL DEFAULT 'MANUAL',
    "status" "VitalStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "body_fat_percentage" DOUBLE PRECISION,
    "lean_mass" DOUBLE PRECISION,
    "fat_mass" DOUBLE PRECISION,
    "visceral_fat" DOUBLE PRECISION,
    "waist_circumference" DOUBLE PRECISION,
    "hip_circumference" DOUBLE PRECISION,
    "neck_circumference" DOUBLE PRECISION,
    "chest_circumference" DOUBLE PRECISION,
    "arm_circumference" DOUBLE PRECISION,
    "thigh_circumference" DOUBLE PRECISION,
    "calf_circumference" DOUBLE PRECISION,
    "heart_rate" INTEGER,
    "blood_pressure_systolic" INTEGER,
    "blood_pressure_diastolic" INTEGER,
    "respiratory_rate" INTEGER,
    "body_temperature" DOUBLE PRECISION,
    "oxygen_saturation" DOUBLE PRECISION,
    "blood_glucose" DOUBLE PRECISION,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vital_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biomarkers" (
    "id" TEXT NOT NULL,
    "vital_record_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "reference_min" DOUBLE PRECISION,
    "reference_max" DOUBLE PRECISION,
    "status" "BiomarkerStatus" NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biomarkers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_record_history" (
    "id" TEXT NOT NULL,
    "vital_record_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "previous_value" TEXT,
    "new_value" TEXT,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vital_record_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "TemplateCategory" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "organization_id" TEXT,
    "created_by" TEXT NOT NULL,
    "scoring_engine" TEXT NOT NULL DEFAULT 'weighted-sum',
    "scoring_config" JSONB,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_sections" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_fields" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "placeholder" TEXT,
    "field_type" "FieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "min" DOUBLE PRECISION,
    "max" DOUBLE PRECISION,
    "unit" TEXT,
    "default_value" TEXT,
    "options" JSONB,
    "validation_rules" JSONB,
    "scoring_weight" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "professional_id" TEXT,
    "organization_id" TEXT,
    "template_id" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "performed_at" TIMESTAMP(3),
    "validated_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "notes" TEXT,
    "total_score" DOUBLE PRECISION,
    "max_score" DOUBLE PRECISION,
    "score_percent" DOUBLE PRECISION,
    "classification" TEXT,
    "risk_level" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_answers" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "value" TEXT,
    "score" DOUBLE PRECISION,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_evidence" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_history" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "previous_value" TEXT,
    "new_value" TEXT,
    "changed_by" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "patient_id" TEXT,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "firmware_version" TEXT,
    "connection_type" "ConnectionType" NOT NULL DEFAULT 'BLE',
    "status" "DeviceStatus" NOT NULL DEFAULT 'DISCOVERED',
    "last_seen" TIMESTAMP(3),
    "battery_level" INTEGER,
    "mac_address" TEXT,
    "rssi" INTEGER,
    "signal_strength" TEXT,
    "total_connections" INTEGER NOT NULL DEFAULT 0,
    "total_reconnections" INTEGER NOT NULL DEFAULT 0,
    "total_errors" INTEGER NOT NULL DEFAULT 0,
    "avg_signal_quality" DOUBLE PRECISION,
    "avg_latency_ms" DOUBLE PRECISION,
    "paired_by" TEXT,
    "paired_at" TIMESTAMP(3),
    "org_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_sessions" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "status" "DeviceSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "error" TEXT,
    "bytes_received" BIGINT NOT NULL DEFAULT 0,
    "bytes_sent" BIGINT NOT NULL DEFAULT 0,
    "reconnections" INTEGER NOT NULL DEFAULT 0,
    "signal_quality" DOUBLE PRECISION,
    "latency_ms" DOUBLE PRECISION,

    CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_measurements" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "session_id" TEXT,
    "patient_id" TEXT,
    "organization_id" TEXT,
    "recorded_by" TEXT,
    "driver_name" TEXT NOT NULL,
    "measurement_type" TEXT NOT NULL,
    "status" "MeasurementStatus" NOT NULL DEFAULT 'PENDING',
    "raw_data" JSONB NOT NULL,
    "normalized_data" JSONB NOT NULL,
    "unit" TEXT,
    "validation_flags" JSONB,
    "vital_record_id" TEXT,
    "processed_at" TIMESTAMP(3),
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_calibrations" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "calibrated_by" TEXT NOT NULL,
    "calibrated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "notes" TEXT,
    "reference_values" JSONB,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_calibrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bio_scores" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "health_score" DOUBLE PRECISION NOT NULL,
    "recovery_score" DOUBLE PRECISION NOT NULL,
    "cardio_score" DOUBLE PRECISION NOT NULL,
    "body_score" DOUBLE PRECISION NOT NULL,
    "sleep_score" DOUBLE PRECISION NOT NULL,
    "activity_score" DOUBLE PRECISION NOT NULL,
    "consistency_score" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bio_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_metrics" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "bmi" DOUBLE PRECISION,
    "bmi_classification" TEXT,
    "ideal_weight_kg" DOUBLE PRECISION,
    "body_fat_pct" DOUBLE PRECISION,
    "lean_mass_kg" DOUBLE PRECISION,
    "fat_mass_kg" DOUBLE PRECISION,
    "waist_height_ratio" DOUBLE PRECISION,
    "bmr" INTEGER,
    "tdee" INTEGER,
    "obesity_index" DOUBLE PRECISION,
    "body_classification" TEXT,
    "score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cardio_metrics" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "resting_hr" INTEGER,
    "max_hr_estimated" INTEGER,
    "max_hr_measured" INTEGER,
    "zone1_min" INTEGER,
    "zone1_max" INTEGER,
    "zone2_min" INTEGER,
    "zone2_max" INTEGER,
    "zone3_min" INTEGER,
    "zone3_max" INTEGER,
    "zone4_min" INTEGER,
    "zone4_max" INTEGER,
    "zone5_min" INTEGER,
    "zone5_max" INTEGER,
    "hrv_ms" DOUBLE PRECISION,
    "cardiac_recovery_bpm" INTEGER,
    "vo2max_estimated" DOUBLE PRECISION,
    "classification" TEXT,
    "score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cardio_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sleep_metrics" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "bedtime" TIMESTAMP(3),
    "wake_time" TIMESTAMP(3),
    "total_minutes" INTEGER,
    "deep_minutes" INTEGER,
    "rem_minutes" INTEGER,
    "light_minutes" INTEGER,
    "awake_minutes" INTEGER,
    "efficiency" DOUBLE PRECISION,
    "sleep_debt_min" INTEGER,
    "classification" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sleep_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_metrics" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "recovery_score" DOUBLE PRECISION NOT NULL,
    "sleep_score" DOUBLE PRECISION,
    "hrv_score" DOUBLE PRECISION,
    "hr_score" DOUBLE PRECISION,
    "training_load_score" DOUBLE PRECISION,
    "acute_load" DOUBLE PRECISION,
    "chronic_load" DOUBLE PRECISION,
    "training_stress_balance" DOUBLE PRECISION,
    "recommendation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sport_metrics" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "sport" "SportType" NOT NULL,
    "avg_pace_sec_per_km" INTEGER,
    "max_pace_sec_per_km" INTEGER,
    "vo2max_estimated" DOUBLE PRECISION,
    "weekly_distance_m" INTEGER,
    "weekly_load_points" DOUBLE PRECISION,
    "estimated_ftp_watts" DOUBLE PRECISION,
    "avg_cadence_rpm" INTEGER,
    "avg_speed_kph" DOUBLE PRECISION,
    "avg_pace_per_100m_sec" INTEGER,
    "swolf" INTEGER,
    "weekly_volume_sets" INTEGER,
    "weekly_tonnage_kg" DOUBLE PRECISION,
    "load_progression_pct" DOUBLE PRECISION,
    "session_count" INTEGER,
    "active_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sport_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_analyses" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "value_start" DOUBLE PRECISION NOT NULL,
    "value_end" DOUBLE PRECISION NOT NULL,
    "change_pct" DOUBLE PRECISION NOT NULL,
    "trend" TEXT NOT NULL,
    "moving_average" DOUBLE PRECISION,
    "is_personal_record" BOOLEAN NOT NULL DEFAULT false,
    "is_plateau_detected" BOOLEAN NOT NULL DEFAULT false,
    "regression_slope" DOUBLE PRECISION,
    "data_points" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trend_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metric" TEXT,
    "value" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_sources" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "platform" "HealthPlatform" NOT NULL,
    "status" "HealthSourceStatus" NOT NULL DEFAULT 'PENDING',
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "external_user_id" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_health_data" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "platform" "HealthPlatform" NOT NULL,
    "metric_type" "OracleMetricType" NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "raw_health_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "normalized_health_data" (
    "id" TEXT NOT NULL,
    "raw_data_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "metric_type" "OracleMetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "source" "HealthPlatform" NOT NULL,
    "qualifier" TEXT,
    "is_duplicate" BOOLEAN NOT NULL DEFAULT false,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "validation_errors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "normalized_health_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "platform" "HealthPlatform" NOT NULL,
    "status" "OracleSyncStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "raw_records_count" INTEGER NOT NULL DEFAULT 0,
    "normalized_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_metrics" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "steps" INTEGER,
    "calories" INTEGER,
    "sleep_minutes" INTEGER,
    "avg_heart_rate" DOUBLE PRECISION,
    "min_heart_rate" DOUBLE PRECISION,
    "max_heart_rate" DOUBLE PRECISION,
    "resting_hr" DOUBLE PRECISION,
    "hrv" DOUBLE PRECISION,
    "spo2" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "body_fat" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "blood_pressure_systolic" DOUBLE PRECISION,
    "blood_pressure_diastolic" DOUBLE PRECISION,
    "sync_count" INTEGER NOT NULL DEFAULT 0,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_health_scores" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "overall" DOUBLE PRECISION NOT NULL,
    "sleep_score" DOUBLE PRECISION,
    "steps_score" DOUBLE PRECISION,
    "exercise_score" DOUBLE PRECISION,
    "hr_score" DOUBLE PRECISION,
    "recovery_score" DOUBLE PRECISION,
    "hydration_score" DOUBLE PRECISION,
    "metadata" JSONB,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_health_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_load" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "daily_load" DOUBLE PRECISION NOT NULL,
    "weekly_load" DOUBLE PRECISION NOT NULL,
    "monthly_load" DOUBLE PRECISION NOT NULL,
    "atl" DOUBLE PRECISION NOT NULL,
    "ctl" DOUBLE PRECISION NOT NULL,
    "tsb" DOUBLE PRECISION NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_load_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_insights" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "category" "InsightCategory" NOT NULL,
    "priority" "InsightPriority" NOT NULL,
    "insight_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "algorithm" TEXT NOT NULL,
    "model_version" TEXT NOT NULL DEFAULT '1.0.0',
    "data_window" INTEGER NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "insight_id" TEXT,
    "priority" "InsightPriority" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "action" TEXT NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "accepted_at" TIMESTAMP(3),
    "ignored_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_goals" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "type" "GoalType" NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "current_value" DOUBLE PRECISION,
    "start_value" DOUBLE PRECISION,
    "progress_pct" DOUBLE PRECISION,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" DATE NOT NULL,
    "target_date" DATE,
    "auto_adjust" BOOLEAN NOT NULL DEFAULT true,
    "adjusted_at" TIMESTAMP(3),
    "achieved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_history" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "previous_target" DOUBLE PRECISION,
    "new_target" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "adjusted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_predictions" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "horizon" TEXT NOT NULL,
    "current_value" DOUBLE PRECISION,
    "predicted_value" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "trend" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ProgramCategory" NOT NULL DEFAULT 'CUSTOM',
    "duration_days" INTEGER,
    "objectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "completion_criteria" TEXT,
    "status" "ProgramStatus" NOT NULL DEFAULT 'DRAFT',
    "organization_id" TEXT,
    "created_by" TEXT NOT NULL,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_phases" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "duration_days" INTEGER,
    "objectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_enrollments" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "professional_id" TEXT,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_phase" INTEGER NOT NULL DEFAULT 1,
    "progress_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adherence_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "start_date" DATE NOT NULL,
    "expected_end_date" DATE,
    "completed_at" TIMESTAMP(3),
    "paused_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metric" TEXT,
    "target_value" DOUBLE PRECISION,
    "current_value" DOUBLE PRECISION,
    "unit" TEXT,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "order" INTEGER NOT NULL DEFAULT 0,
    "due_date" DATE,
    "achieved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "program_id" TEXT,
    "enrollment_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "recurrence" "TaskRecurrence" NOT NULL DEFAULT 'ONCE',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "due_date" DATE,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_completions" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "task_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "note_type" TEXT NOT NULL DEFAULT 'EVOLUTION',
    "attachments" JSONB,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaires" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'CUSTOM',
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "questionnaire_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "question_type" TEXT NOT NULL DEFAULT 'TEXT',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "min_value" DOUBLE PRECISION,
    "max_value" DOUBLE PRECISION,
    "unit" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" TEXT NOT NULL,
    "questionnaire_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "enrollment_id" TEXT,
    "value" TEXT NOT NULL,
    "numeric_value" DOUBLE PRECISION,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_records" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "recordType" "ClinicalRecordType" NOT NULL,
    "status" "ClinicalStatus" NOT NULL DEFAULT 'ACTIVE',
    "code" TEXT,
    "code_system" TEXT,
    "display_name" TEXT,
    "source_system" TEXT,
    "source_id" TEXT,
    "effective_date" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "checksum" TEXT,
    "imported_via" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_observations" (
    "id" TEXT NOT NULL,
    "clinical_record_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "code" TEXT,
    "code_system" TEXT,
    "display_name" TEXT,
    "value" TEXT,
    "numeric_value" DOUBLE PRECISION,
    "unit" TEXT,
    "reference_range" TEXT,
    "interpretation" TEXT,
    "effective_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "code_system" TEXT,
    "dosage" TEXT,
    "frequency" TEXT,
    "route" TEXT,
    "status" "ClinicalStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "prescribed_by" TEXT,
    "source_system" TEXT,
    "source_id" TEXT,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergies" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,
    "code" TEXT,
    "code_system" TEXT,
    "reaction" TEXT,
    "severity" TEXT,
    "status" "ClinicalStatus" NOT NULL DEFAULT 'ACTIVE',
    "onset_date" TIMESTAMP(3),
    "verified_date" TIMESTAMP(3),
    "source_system" TEXT,
    "source_id" TEXT,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedures" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "code_system" TEXT,
    "status" "ClinicalStatus" NOT NULL DEFAULT 'ACTIVE',
    "performed_date" TIMESTAMP(3),
    "performed_by" TEXT,
    "location" TEXT,
    "outcome" TEXT,
    "notes" TEXT,
    "source_system" TEXT,
    "source_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "granted_by" TEXT NOT NULL,
    "scopes" TEXT[],
    "status" "ConsentStatus" NOT NULL DEFAULT 'ACTIVE',
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked_by" TEXT,
    "revoke_reason" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interop_jobs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "patient_id" TEXT,
    "direction" "InteropDirection" NOT NULL,
    "adapter" "InteropAdapter" NOT NULL,
    "status" "InteropJobStatus" NOT NULL DEFAULT 'PENDING',
    "source_system" TEXT,
    "total_records" INTEGER NOT NULL DEFAULT 0,
    "processed_records" INTEGER NOT NULL DEFAULT 0,
    "failed_records" INTEGER NOT NULL DEFAULT 0,
    "conflicts_found" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interop_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interop_logs" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "record_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interop_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_identifiers" (
    "id" TEXT NOT NULL,
    "clinical_record_id" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "use" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_cpf_key" ON "profiles"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_user_id_key" ON "professionals"("user_id");

-- CreateIndex
CREATE INDEX "professionals_specialty_idx" ON "professionals"("specialty");

-- CreateIndex
CREATE INDEX "professionals_deleted_at_idx" ON "professionals"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_registration_code_key" ON "patients"("registration_code");

-- CreateIndex
CREATE INDEX "patients_deleted_at_idx" ON "patients"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_document_key" ON "organizations"("document");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- CreateIndex
CREATE INDEX "organizations_deleted_at_idx" ON "organizations"("deleted_at");

-- CreateIndex
CREATE INDEX "branches_organization_id_idx" ON "branches"("organization_id");

-- CreateIndex
CREATE INDEX "branches_deleted_at_idx" ON "branches"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "organization_settings_organization_id_key" ON "organization_settings"("organization_id");

-- CreateIndex
CREATE INDEX "memberships_organization_id_idx" ON "memberships"("organization_id");

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- CreateIndex
CREATE INDEX "memberships_branch_id_idx" ON "memberships"("branch_id");

-- CreateIndex
CREATE INDEX "memberships_deleted_at_idx" ON "memberships"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_organization_id_user_id_key" ON "memberships"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invites_token_key" ON "invites"("token");

-- CreateIndex
CREATE INDEX "invites_email_idx" ON "invites"("email");

-- CreateIndex
CREATE INDEX "invites_organization_id_idx" ON "invites"("organization_id");

-- CreateIndex
CREATE INDEX "invites_status_idx" ON "invites"("status");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "vital_records_patient_id_idx" ON "vital_records"("patient_id");

-- CreateIndex
CREATE INDEX "vital_records_patient_id_recorded_at_idx" ON "vital_records"("patient_id", "recorded_at");

-- CreateIndex
CREATE INDEX "vital_records_professional_id_idx" ON "vital_records"("professional_id");

-- CreateIndex
CREATE INDEX "vital_records_organization_id_idx" ON "vital_records"("organization_id");

-- CreateIndex
CREATE INDEX "vital_records_recorded_at_idx" ON "vital_records"("recorded_at");

-- CreateIndex
CREATE INDEX "vital_records_status_idx" ON "vital_records"("status");

-- CreateIndex
CREATE INDEX "vital_records_deleted_at_idx" ON "vital_records"("deleted_at");

-- CreateIndex
CREATE INDEX "biomarkers_vital_record_id_idx" ON "biomarkers"("vital_record_id");

-- CreateIndex
CREATE INDEX "biomarkers_name_idx" ON "biomarkers"("name");

-- CreateIndex
CREATE INDEX "vital_record_history_vital_record_id_idx" ON "vital_record_history"("vital_record_id");

-- CreateIndex
CREATE INDEX "vital_record_history_changed_by_idx" ON "vital_record_history"("changed_by");

-- CreateIndex
CREATE INDEX "vital_record_history_changed_at_idx" ON "vital_record_history"("changed_at");

-- CreateIndex
CREATE INDEX "assessment_templates_category_idx" ON "assessment_templates"("category");

-- CreateIndex
CREATE INDEX "assessment_templates_organization_id_idx" ON "assessment_templates"("organization_id");

-- CreateIndex
CREATE INDEX "assessment_templates_is_active_idx" ON "assessment_templates"("is_active");

-- CreateIndex
CREATE INDEX "assessment_templates_deleted_at_idx" ON "assessment_templates"("deleted_at");

-- CreateIndex
CREATE INDEX "assessment_sections_template_id_idx" ON "assessment_sections"("template_id");

-- CreateIndex
CREATE INDEX "assessment_fields_section_id_idx" ON "assessment_fields"("section_id");

-- CreateIndex
CREATE INDEX "assessments_patient_id_idx" ON "assessments"("patient_id");

-- CreateIndex
CREATE INDEX "assessments_professional_id_idx" ON "assessments"("professional_id");

-- CreateIndex
CREATE INDEX "assessments_organization_id_idx" ON "assessments"("organization_id");

-- CreateIndex
CREATE INDEX "assessments_template_id_idx" ON "assessments"("template_id");

-- CreateIndex
CREATE INDEX "assessments_performed_at_idx" ON "assessments"("performed_at");

-- CreateIndex
CREATE INDEX "assessments_status_idx" ON "assessments"("status");

-- CreateIndex
CREATE INDEX "assessments_deleted_at_idx" ON "assessments"("deleted_at");

-- CreateIndex
CREATE INDEX "assessment_answers_assessment_id_idx" ON "assessment_answers"("assessment_id");

-- CreateIndex
CREATE INDEX "assessment_answers_field_id_idx" ON "assessment_answers"("field_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_answers_assessment_id_field_id_key" ON "assessment_answers"("assessment_id", "field_id");

-- CreateIndex
CREATE INDEX "assessment_evidence_assessment_id_idx" ON "assessment_evidence"("assessment_id");

-- CreateIndex
CREATE INDEX "assessment_history_assessment_id_idx" ON "assessment_history"("assessment_id");

-- CreateIndex
CREATE INDEX "assessment_history_changed_by_idx" ON "assessment_history"("changed_by");

-- CreateIndex
CREATE INDEX "assessment_history_changed_at_idx" ON "assessment_history"("changed_at");

-- CreateIndex
CREATE INDEX "devices_organization_id_idx" ON "devices"("organization_id");

-- CreateIndex
CREATE INDEX "devices_patient_id_idx" ON "devices"("patient_id");

-- CreateIndex
CREATE INDEX "devices_status_idx" ON "devices"("status");

-- CreateIndex
CREATE INDEX "devices_connection_type_idx" ON "devices"("connection_type");

-- CreateIndex
CREATE INDEX "devices_mac_address_idx" ON "devices"("mac_address");

-- CreateIndex
CREATE INDEX "devices_deleted_at_idx" ON "devices"("deleted_at");

-- CreateIndex
CREATE INDEX "device_sessions_device_id_idx" ON "device_sessions"("device_id");

-- CreateIndex
CREATE INDEX "device_sessions_status_idx" ON "device_sessions"("status");

-- CreateIndex
CREATE INDEX "device_sessions_started_at_idx" ON "device_sessions"("started_at");

-- CreateIndex
CREATE INDEX "device_measurements_device_id_idx" ON "device_measurements"("device_id");

-- CreateIndex
CREATE INDEX "device_measurements_patient_id_idx" ON "device_measurements"("patient_id");

-- CreateIndex
CREATE INDEX "device_measurements_status_idx" ON "device_measurements"("status");

-- CreateIndex
CREATE INDEX "device_measurements_measurement_type_idx" ON "device_measurements"("measurement_type");

-- CreateIndex
CREATE INDEX "device_measurements_recorded_at_idx" ON "device_measurements"("recorded_at");

-- CreateIndex
CREATE INDEX "device_calibrations_device_id_idx" ON "device_calibrations"("device_id");

-- CreateIndex
CREATE INDEX "device_calibrations_is_valid_idx" ON "device_calibrations"("is_valid");

-- CreateIndex
CREATE INDEX "device_calibrations_expires_at_idx" ON "device_calibrations"("expires_at");

-- CreateIndex
CREATE INDEX "bio_scores_patient_id_calculated_at_idx" ON "bio_scores"("patient_id", "calculated_at");

-- CreateIndex
CREATE INDEX "health_metrics_patient_id_recorded_at_idx" ON "health_metrics"("patient_id", "recorded_at");

-- CreateIndex
CREATE INDEX "cardio_metrics_patient_id_recorded_at_idx" ON "cardio_metrics"("patient_id", "recorded_at");

-- CreateIndex
CREATE INDEX "sleep_metrics_patient_id_date_idx" ON "sleep_metrics"("patient_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "sleep_metrics_patient_id_date_key" ON "sleep_metrics"("patient_id", "date");

-- CreateIndex
CREATE INDEX "recovery_metrics_patient_id_recorded_at_idx" ON "recovery_metrics"("patient_id", "recorded_at");

-- CreateIndex
CREATE INDEX "sport_metrics_patient_id_recorded_at_sport_idx" ON "sport_metrics"("patient_id", "recorded_at", "sport");

-- CreateIndex
CREATE INDEX "trend_analyses_patient_id_metric_period_start_idx" ON "trend_analyses"("patient_id", "metric", "period_start");

-- CreateIndex
CREATE INDEX "alerts_patient_id_is_read_triggered_at_idx" ON "alerts"("patient_id", "is_read", "triggered_at");

-- CreateIndex
CREATE INDEX "alerts_patient_id_type_idx" ON "alerts"("patient_id", "type");

-- CreateIndex
CREATE INDEX "health_sources_patient_id_status_idx" ON "health_sources"("patient_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "health_sources_patient_id_platform_key" ON "health_sources"("patient_id", "platform");

-- CreateIndex
CREATE INDEX "raw_health_data_source_id_is_processed_idx" ON "raw_health_data"("source_id", "is_processed");

-- CreateIndex
CREATE INDEX "raw_health_data_patient_id_metric_type_recorded_at_idx" ON "raw_health_data"("patient_id", "metric_type", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "normalized_health_data_raw_data_id_key" ON "normalized_health_data"("raw_data_id");

-- CreateIndex
CREATE INDEX "normalized_health_data_patient_id_metric_type_recorded_at_idx" ON "normalized_health_data"("patient_id", "metric_type", "recorded_at");

-- CreateIndex
CREATE INDEX "normalized_health_data_patient_id_is_duplicate_is_valid_idx" ON "normalized_health_data"("patient_id", "is_duplicate", "is_valid");

-- CreateIndex
CREATE INDEX "sync_jobs_source_id_status_idx" ON "sync_jobs"("source_id", "status");

-- CreateIndex
CREATE INDEX "sync_jobs_patient_id_started_at_idx" ON "sync_jobs"("patient_id", "started_at");

-- CreateIndex
CREATE INDEX "sync_logs_job_id_level_idx" ON "sync_logs"("job_id", "level");

-- CreateIndex
CREATE INDEX "daily_metrics_patient_id_date_idx" ON "daily_metrics"("patient_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_metrics_patient_id_date_key" ON "daily_metrics"("patient_id", "date");

-- CreateIndex
CREATE INDEX "daily_health_scores_patient_id_date_idx" ON "daily_health_scores"("patient_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_health_scores_patient_id_date_key" ON "daily_health_scores"("patient_id", "date");

-- CreateIndex
CREATE INDEX "training_load_patient_id_date_idx" ON "training_load"("patient_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "training_load_patient_id_date_key" ON "training_load"("patient_id", "date");

-- CreateIndex
CREATE INDEX "health_insights_patient_id_generated_at_idx" ON "health_insights"("patient_id", "generated_at");

-- CreateIndex
CREATE INDEX "health_insights_patient_id_is_read_idx" ON "health_insights"("patient_id", "is_read");

-- CreateIndex
CREATE INDEX "health_insights_patient_id_category_idx" ON "health_insights"("patient_id", "category");

-- CreateIndex
CREATE INDEX "health_insights_patient_id_insight_type_idx" ON "health_insights"("patient_id", "insight_type");

-- CreateIndex
CREATE INDEX "recommendations_patient_id_status_idx" ON "recommendations"("patient_id", "status");

-- CreateIndex
CREATE INDEX "recommendations_patient_id_generated_at_idx" ON "recommendations"("patient_id", "generated_at");

-- CreateIndex
CREATE INDEX "user_goals_patient_id_status_idx" ON "user_goals"("patient_id", "status");

-- CreateIndex
CREATE INDEX "user_goals_patient_id_type_idx" ON "user_goals"("patient_id", "type");

-- CreateIndex
CREATE INDEX "goal_history_goal_id_idx" ON "goal_history"("goal_id");

-- CreateIndex
CREATE INDEX "goal_history_patient_id_idx" ON "goal_history"("patient_id");

-- CreateIndex
CREATE INDEX "health_predictions_patient_id_metric_idx" ON "health_predictions"("patient_id", "metric");

-- CreateIndex
CREATE INDEX "health_predictions_patient_id_generated_at_idx" ON "health_predictions"("patient_id", "generated_at");

-- CreateIndex
CREATE INDEX "care_programs_category_idx" ON "care_programs"("category");

-- CreateIndex
CREATE INDEX "care_programs_status_idx" ON "care_programs"("status");

-- CreateIndex
CREATE INDEX "care_programs_organization_id_idx" ON "care_programs"("organization_id");

-- CreateIndex
CREATE INDEX "program_phases_program_id_idx" ON "program_phases"("program_id");

-- CreateIndex
CREATE INDEX "program_enrollments_patient_id_status_idx" ON "program_enrollments"("patient_id", "status");

-- CreateIndex
CREATE INDEX "program_enrollments_program_id_idx" ON "program_enrollments"("program_id");

-- CreateIndex
CREATE INDEX "program_enrollments_professional_id_idx" ON "program_enrollments"("professional_id");

-- CreateIndex
CREATE INDEX "milestones_enrollment_id_idx" ON "milestones"("enrollment_id");

-- CreateIndex
CREATE INDEX "milestones_patient_id_status_idx" ON "milestones"("patient_id", "status");

-- CreateIndex
CREATE INDEX "tasks_patient_id_status_due_date_idx" ON "tasks"("patient_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "tasks_enrollment_id_status_idx" ON "tasks"("enrollment_id", "status");

-- CreateIndex
CREATE INDEX "task_completions_task_id_idx" ON "task_completions"("task_id");

-- CreateIndex
CREATE INDEX "task_completions_patient_id_completed_at_idx" ON "task_completions"("patient_id", "completed_at");

-- CreateIndex
CREATE INDEX "clinical_notes_enrollment_id_idx" ON "clinical_notes"("enrollment_id");

-- CreateIndex
CREATE INDEX "clinical_notes_patient_id_idx" ON "clinical_notes"("patient_id");

-- CreateIndex
CREATE INDEX "clinical_notes_professional_id_idx" ON "clinical_notes"("professional_id");

-- CreateIndex
CREATE INDEX "questionnaires_category_idx" ON "questionnaires"("category");

-- CreateIndex
CREATE INDEX "questionnaires_is_active_idx" ON "questionnaires"("is_active");

-- CreateIndex
CREATE INDEX "questions_questionnaire_id_idx" ON "questions"("questionnaire_id");

-- CreateIndex
CREATE INDEX "answers_questionnaire_id_patient_id_idx" ON "answers"("questionnaire_id", "patient_id");

-- CreateIndex
CREATE INDEX "answers_question_id_idx" ON "answers"("question_id");

-- CreateIndex
CREATE INDEX "clinical_records_patient_id_idx" ON "clinical_records"("patient_id");

-- CreateIndex
CREATE INDEX "clinical_records_recordType_idx" ON "clinical_records"("recordType");

-- CreateIndex
CREATE INDEX "clinical_records_patient_id_effective_date_idx" ON "clinical_records"("patient_id", "effective_date");

-- CreateIndex
CREATE INDEX "clinical_records_source_system_source_id_idx" ON "clinical_records"("source_system", "source_id");

-- CreateIndex
CREATE INDEX "clinical_observations_clinical_record_id_idx" ON "clinical_observations"("clinical_record_id");

-- CreateIndex
CREATE INDEX "clinical_observations_patient_id_idx" ON "clinical_observations"("patient_id");

-- CreateIndex
CREATE INDEX "medications_patient_id_idx" ON "medications"("patient_id");

-- CreateIndex
CREATE INDEX "medications_status_idx" ON "medications"("status");

-- CreateIndex
CREATE INDEX "allergies_patient_id_idx" ON "allergies"("patient_id");

-- CreateIndex
CREATE INDEX "allergies_status_idx" ON "allergies"("status");

-- CreateIndex
CREATE INDEX "procedures_patient_id_idx" ON "procedures"("patient_id");

-- CreateIndex
CREATE INDEX "procedures_status_idx" ON "procedures"("status");

-- CreateIndex
CREATE INDEX "consents_patient_id_idx" ON "consents"("patient_id");

-- CreateIndex
CREATE INDEX "consents_organization_id_idx" ON "consents"("organization_id");

-- CreateIndex
CREATE INDEX "consents_status_idx" ON "consents"("status");

-- CreateIndex
CREATE INDEX "interop_jobs_organization_id_idx" ON "interop_jobs"("organization_id");

-- CreateIndex
CREATE INDEX "interop_jobs_patient_id_idx" ON "interop_jobs"("patient_id");

-- CreateIndex
CREATE INDEX "interop_jobs_status_idx" ON "interop_jobs"("status");

-- CreateIndex
CREATE INDEX "interop_logs_job_id_idx" ON "interop_logs"("job_id");

-- CreateIndex
CREATE INDEX "external_identifiers_clinical_record_id_idx" ON "external_identifiers"("clinical_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_identifiers_system_value_key" ON "external_identifiers"("system", "value");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_primary_professional_id_fkey" FOREIGN KEY ("primary_professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_records" ADD CONSTRAINT "vital_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_records" ADD CONSTRAINT "vital_records_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_records" ADD CONSTRAINT "vital_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biomarkers" ADD CONSTRAINT "biomarkers_vital_record_id_fkey" FOREIGN KEY ("vital_record_id") REFERENCES "vital_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_record_history" ADD CONSTRAINT "vital_record_history_vital_record_id_fkey" FOREIGN KEY ("vital_record_id") REFERENCES "vital_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_templates" ADD CONSTRAINT "assessment_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_templates" ADD CONSTRAINT "assessment_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_sections" ADD CONSTRAINT "assessment_sections_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "assessment_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_fields" ADD CONSTRAINT "assessment_fields_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "assessment_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "assessment_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "assessment_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_evidence" ADD CONSTRAINT "assessment_evidence_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_history" ADD CONSTRAINT "assessment_history_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_paired_by_fkey" FOREIGN KEY ("paired_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_measurements" ADD CONSTRAINT "device_measurements_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_measurements" ADD CONSTRAINT "device_measurements_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_calibrations" ADD CONSTRAINT "device_calibrations_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bio_scores" ADD CONSTRAINT "bio_scores_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_metrics" ADD CONSTRAINT "health_metrics_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cardio_metrics" ADD CONSTRAINT "cardio_metrics_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleep_metrics" ADD CONSTRAINT "sleep_metrics_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_metrics" ADD CONSTRAINT "recovery_metrics_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sport_metrics" ADD CONSTRAINT "sport_metrics_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_analyses" ADD CONSTRAINT "trend_analyses_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_sources" ADD CONSTRAINT "health_sources_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_health_data" ADD CONSTRAINT "raw_health_data_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "health_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "normalized_health_data" ADD CONSTRAINT "normalized_health_data_raw_data_id_fkey" FOREIGN KEY ("raw_data_id") REFERENCES "raw_health_data"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "normalized_health_data" ADD CONSTRAINT "normalized_health_data_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "health_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "sync_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_health_scores" ADD CONSTRAINT "daily_health_scores_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_load" ADD CONSTRAINT "training_load_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_insights" ADD CONSTRAINT "health_insights_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_insight_id_fkey" FOREIGN KEY ("insight_id") REFERENCES "health_insights"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_goals" ADD CONSTRAINT "user_goals_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_history" ADD CONSTRAINT "goal_history_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "user_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_history" ADD CONSTRAINT "goal_history_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_predictions" ADD CONSTRAINT "health_predictions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_phases" ADD CONSTRAINT "program_phases_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "care_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_enrollments" ADD CONSTRAINT "program_enrollments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "care_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_enrollments" ADD CONSTRAINT "program_enrollments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_enrollments" ADD CONSTRAINT "program_enrollments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "program_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "care_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "program_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "program_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_observations" ADD CONSTRAINT "clinical_observations_clinical_record_id_fkey" FOREIGN KEY ("clinical_record_id") REFERENCES "clinical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_observations" ADD CONSTRAINT "clinical_observations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interop_logs" ADD CONSTRAINT "interop_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "interop_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_identifiers" ADD CONSTRAINT "external_identifiers_clinical_record_id_fkey" FOREIGN KEY ("clinical_record_id") REFERENCES "clinical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;


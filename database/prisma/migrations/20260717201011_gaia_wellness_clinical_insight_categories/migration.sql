-- CreateEnum
CREATE TYPE "WellnessInsightCategory" AS ENUM ('SLEEP', 'HEART_RATE', 'HRV', 'TRAINING_LOAD', 'ACTIVITY', 'WEIGHT', 'BODY_COMPOSITION', 'RECOVERY', 'CARDIOVASCULAR');

-- CreateEnum
CREATE TYPE "ClinicalInsightCategory" AS ENUM ('METABOLIC', 'CARDIOVASCULAR', 'COGNITIVE', 'NUTRITION', 'MENTAL_HEALTH', 'PREVENTIVE_CARE', 'MEDICATION_ADHERENCE');

-- AlterTable
ALTER TABLE "health_insights" DROP COLUMN "category",
ADD COLUMN     "category" "WellnessInsightCategory" NOT NULL;

-- DropEnum
DROP TYPE "InsightCategory";

-- CreateIndex
CREATE INDEX "health_insights_patient_id_category_idx" ON "health_insights"("patient_id", "category");


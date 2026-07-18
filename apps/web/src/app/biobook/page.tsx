"use client";

import { useBioBookData } from '@/modules/biobook/hooks/useBioBookData';
import { BioBookLayout } from '@/modules/biobook/layouts/BioBookLayout';
import { LoadingSkeleton } from '@/modules/biobook/widgets/LoadingSkeleton';
import { BioHeader } from '@/modules/biobook/components/BioHeader';
import { EvolutionCard } from '@/modules/biobook/components/EvolutionCard';
import { ProgressWidget } from '@/modules/biobook/components/ProgressWidget';
import { AchievementTimeline } from '@/modules/biobook/components/AchievementTimeline';
import { PhotoComparison } from '@/modules/biobook/components/PhotoComparison';
import { HealthOverview } from '@/modules/biobook/components/HealthOverview';
import { CircleSummary } from '@/modules/biobook/components/CircleSummary';

export default function BioBookPage() {
  // patientId would come from auth context in a real session
  const { data, loading, isDemo } = useBioBookData();

  if (loading) {
    return (
      <BioBookLayout>
        <LoadingSkeleton />
      </BioBookLayout>
    );
  }

  if (!data) return null;

  return (
    <BioBookLayout>
      {isDemo && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
        >
          Modo demonstração — conecte-se para ver seus dados reais.
        </div>
      )}

      <div className="space-y-4">
        {/* Header */}
        <BioHeader {...data.user} />

        {/* Evolution metrics */}
        <EvolutionCard metrics={data.metrics} />

        {/* Two-column: goals + achievements */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProgressWidget goals={data.goals} />
          <AchievementTimeline achievements={data.achievements} />
        </div>

        {/* Health + circle */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <HealthOverview health={data.health} />
          <CircleSummary circle={data.circle} />
        </div>

        {/* Photo comparison */}
        {data.photos.length > 0 && (
          <PhotoComparison photos={data.photos} />
        )}
      </div>
    </BioBookLayout>
  );
}

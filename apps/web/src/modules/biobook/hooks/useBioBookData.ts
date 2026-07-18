"use client";

import { useState, useEffect } from 'react';
import type { BioBookData } from '../types/biobook.types';
import { buildDemoBioBookData, getPatientTimelineSummary, getPatientTimeline } from '../services/biobook.service';

export interface UseBioBookDataResult {
  data: BioBookData | null;
  loading: boolean;
  isDemo: boolean;
  refresh: () => void;
}

export function useBioBookData(patientId?: string): UseBioBookDataResult {
  const [data, setData] = useState<BioBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const demo = buildDemoBioBookData();

      if (!patientId) {
        if (!cancelled) { setData(demo); setIsDemo(true); setLoading(false); }
        return;
      }

      const [summary, timeline] = await Promise.all([
        getPatientTimelineSummary(patientId),
        getPatientTimeline(patientId),
      ]);

      if (cancelled) return;

      if (summary) {
        const merged: BioBookData = {
          ...demo,
          health: { ...demo.health, ...summary },
          timeline: timeline.length ? timeline : demo.timeline,
        };
        setData(merged);
        setIsDemo(false);
      } else {
        setData(demo);
        setIsDemo(true);
      }

      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [patientId, tick]);

  return { data, loading, isDemo, refresh: () => setTick((t) => t + 1) };
}

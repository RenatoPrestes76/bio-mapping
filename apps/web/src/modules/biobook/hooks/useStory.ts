"use client";

import { useState, useEffect, useCallback } from 'react';
import type { StoryData } from '../types/biobook.types';
import { getStoryChapters, getStoryTimeline, generateStoryChapters } from '../services/biobook.service';

export interface UseStoryResult {
  story: StoryData;
  loading: boolean;
  generating: boolean;
  generate: () => Promise<void>;
}

const EMPTY_STORY: StoryData = { chapters: [], timeline: [], hasStory: false };

export function useStory(): UseStoryResult {
  const [story, setStory] = useState<StoryData>(EMPTY_STORY);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [chapters, timeline] = await Promise.all([
      getStoryChapters(),
      getStoryTimeline(),
    ]);
    setStory({ chapters, timeline, hasStory: chapters.length > 0 });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = useCallback(async () => {
    setGenerating(true);
    await generateStoryChapters();
    await load();
    setGenerating(false);
  }, [load]);

  return { story, loading, generating, generate };
}

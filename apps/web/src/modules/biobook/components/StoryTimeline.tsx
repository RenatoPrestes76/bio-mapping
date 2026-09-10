"use client";

import { useState } from 'react';
import type { StoryTimelineEntry } from '../types/biobook.types';
import { ChapterCard } from './ChapterCard';
import { AchievementBanner } from './AchievementBanner';
import { shareChapter } from '../services/biobook.service';

interface StoryTimelineProps {
  entries: StoryTimelineEntry[];
}

export function StoryTimeline({ entries }: StoryTimelineProps) {
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set());

  async function handleShare(chapterId: string) {
    setSharingId(chapterId);
    const recipientId = prompt('ID do destinatário:');
    if (!recipientId) { setSharingId(null); return; }
    await shareChapter(chapterId, recipientId);
    setSharedIds((prev) => new Set([...prev, chapterId]));
    setSharingId(null);
  }

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-ink-faint">
        Nenhum capítulo ainda. Gere sua história para começar.
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* Vertical connector line */}
      <div
        className="absolute left-5 top-8 h-[calc(100%-4rem)] w-px bg-surface-muted"
        aria-hidden="true"
      />

      {entries.map(({ chapter, events }) => (
        <div key={chapter.id} className="relative pl-12">
          {/* Node on the line */}
          <div
            className="absolute left-3.5 top-5 h-3 w-3 rounded-full border-2 border-primary-600 bg-surface"
            aria-hidden="true"
          />

          {chapter.chapterType === 'ACHIEVEMENT' ? (
            <AchievementBanner chapter={chapter} />
          ) : (
            <ChapterCard
              chapter={chapter}
              eventCount={events.length}
              onShare={sharingId === null ? handleShare : undefined}
            />
          )}

          {/* Events nested under chapter */}
          {events.length > 0 && (
            <ol className="mt-2 space-y-1 pl-2" aria-label={`Eventos de ${chapter.title}`}>
              {events.map((event) => (
                <li key={event.id} className="flex items-start gap-2 py-1">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" aria-hidden="true" />
                  <p className="text-xs text-ink-soft">{event.title}</p>
                </li>
              ))}
            </ol>
          )}

          {sharedIds.has(chapter.id) && (
            <p className="mt-1 text-xs text-success">Capítulo compartilhado!</p>
          )}
        </div>
      ))}
    </div>
  );
}

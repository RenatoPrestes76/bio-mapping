"use client";

import { useState } from 'react';
import { useBioCircle } from '@/modules/biocircle/hooks/useBioCircle';
import { CircleList } from '@/modules/biocircle/components/CircleList';
import { InviteDialog } from '@/modules/biocircle/components/InviteDialog';
import { NotificationCenter } from '@/modules/biocircle/components/NotificationCenter';
import { PrivacySettings } from '@/modules/biocircle/components/PrivacySettings';
import type { ConnectionRelationshipType } from '@/modules/biocircle/types/biocircle.types';

const DEMO_USER_ID = 'demo-user';

export default function BioCirclePage() {
  const { connections, receivedInvites, sentInvites, notifications, dashboard, loading, sendInvite, accept, reject, block, remove } = useBioCircle();
  const [inviteOpen, setInviteOpen] = useState(false);

  async function handleSendInvite(receiverId: string, type: ConnectionRelationshipType) {
    await sendInvite(receiverId, type);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">BioCircle</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Sua rede de apoio privada</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter notifications={notifications} />
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
            >
              + Convidar
            </button>
          </div>
        </div>

        {/* Dashboard stats */}
        {dashboard && (
          <div className="mb-6 grid grid-cols-3 gap-3">
            {[
              { label: 'Conexões', value: dashboard.acceptedCount },
              { label: 'Pendentes', value: dashboard.pendingReceived },
              { label: 'Enviados', value: dashboard.pendingSent },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{value}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-6">
          <CircleList
            connections={connections}
            receivedInvites={receivedInvites}
            sentInvites={sentInvites}
            currentUserId={DEMO_USER_ID}
            onAccept={accept}
            onReject={reject}
            onRemove={remove}
            onBlock={block}
          />

          <PrivacySettings />
        </div>
      </div>

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSubmit={handleSendInvite}
      />
    </main>
  );
}

"use client";

import { useState } from 'react';
import type { BioConnection } from '../types/biocircle.types';
import { ConnectionCard } from './ConnectionCard';

type Tab = 'connections' | 'received' | 'sent';

interface CircleListProps {
  connections: BioConnection[];
  receivedInvites: BioConnection[];
  sentInvites: BioConnection[];
  currentUserId: string;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onRemove: (id: string) => void;
  onBlock: (id: string) => void;
}

const TAB_LABELS: Record<Tab, string> = {
  connections: 'Conexões',
  received: 'Recebidos',
  sent: 'Enviados',
};

export function CircleList({
  connections, receivedInvites, sentInvites,
  currentUserId, onAccept, onReject, onRemove, onBlock,
}: CircleListProps) {
  const [activeTab, setActiveTab] = useState<Tab>('connections');

  const items: Record<Tab, BioConnection[]> = {
    connections,
    received: receivedInvites,
    sent: sentInvites,
  };

  const current = items[activeTab];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-100 dark:border-zinc-800" role="tablist">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'flex-1 py-3 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400',
            ].join(' ')}
          >
            {TAB_LABELS[tab]}
            {items[tab].length > 0 && (
              <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs tabular-nums dark:bg-zinc-800">
                {items[tab].length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {current.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
            {activeTab === 'connections' && 'Nenhuma conexão ainda.'}
            {activeTab === 'received' && 'Nenhum convite recebido.'}
            {activeTab === 'sent' && 'Nenhum convite enviado.'}
          </p>
        ) : (
          <div className="space-y-3">
            {current.map((conn) => (
              <ConnectionCard
                key={conn.id}
                connection={conn}
                currentUserId={currentUserId}
                onAccept={activeTab === 'received' ? onAccept : undefined}
                onReject={activeTab === 'received' ? onReject : undefined}
                onRemove={activeTab === 'connections' ? onRemove : undefined}
                onBlock={activeTab === 'connections' ? onBlock : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

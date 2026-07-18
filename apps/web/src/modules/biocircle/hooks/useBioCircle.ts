"use client";

import { useState, useEffect, useCallback } from 'react';
import type { BioConnection, BioCircleNotification, DashboardStats, ConnectionRelationshipType } from '../types/biocircle.types';
import {
  getDashboard, getConnections, getReceivedInvites, getSentInvites,
  getNotifications, sendInvite as apiSendInvite,
  acceptInvite as apiAccept, rejectInvite as apiReject,
  blockConnection as apiBlock, removeConnection as apiRemove,
} from '../services/biocircle.service';

export interface UseBioCircleResult {
  connections: BioConnection[];
  receivedInvites: BioConnection[];
  sentInvites: BioConnection[];
  notifications: BioCircleNotification[];
  dashboard: DashboardStats | null;
  loading: boolean;
  sendInvite: (receiverId: string, type: ConnectionRelationshipType) => Promise<void>;
  accept: (id: string) => Promise<void>;
  reject: (id: string) => Promise<void>;
  block: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => void;
}

export function useBioCircle(): UseBioCircleResult {
  const [connections, setConnections] = useState<BioConnection[]>([]);
  const [receivedInvites, setReceived] = useState<BioConnection[]>([]);
  const [sentInvites, setSent] = useState<BioConnection[]>([]);
  const [notifications, setNotifications] = useState<BioCircleNotification[]>([]);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getDashboard(),
      getConnections(),
      getReceivedInvites(),
      getSentInvites(),
      getNotifications(),
    ]).then(([dash, conns, received, sent, notifs]) => {
      if (cancelled) return;
      setDashboard(dash);
      setConnections(conns);
      setReceived(received);
      setSent(sent);
      setNotifications(notifs);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [tick]);

  async function sendInvite(receiverId: string, type: ConnectionRelationshipType) {
    await apiSendInvite(receiverId, type);
    refresh();
  }

  async function accept(id: string) { await apiAccept(id); refresh(); }
  async function reject(id: string) { await apiReject(id); refresh(); }
  async function block(id: string) { await apiBlock(id); refresh(); }
  async function remove(id: string) { await apiRemove(id); refresh(); }

  return { connections, receivedInvites, sentInvites, notifications, dashboard, loading, sendInvite, accept, reject, block, remove, refresh };
}

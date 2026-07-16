"use client";

import { useState } from "react";

type ConnectionStatus = "CONNECTED" | "DISCONNECTED" | "PENDING" | "ERROR" | "REVOKED";

interface HealthSource {
  id: string;
  platform: string;
  status: ConnectionStatus;
  lastSyncAt: string | null;
  scopes: string[];
}

interface SyncResult {
  jobId: string;
  rawCount: number;
  normalizedCount: number;
  errorCount: number;
  status: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  APPLE_HEALTH: "Apple Health",
  GOOGLE_FIT: "Google Fit",
  GOOGLE_HEALTH_CONNECT: "Google Health Connect",
  GARMIN: "Garmin",
  POLAR: "Polar",
  FITBIT: "Fitbit",
  AMAZFIT: "Amazfit / Zepp",
  SAMSUNG_HEALTH: "Samsung Health",
  SIMULATOR: "Simulador de Dados",
};

const PLATFORM_COLORS: Record<ConnectionStatus, string> = {
  CONNECTED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  DISCONNECTED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  ERROR: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  REVOKED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
};

function StatusBadge({ status }: { status: ConnectionStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${PLATFORM_COLORS[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "CONNECTED" ? "bg-emerald-500" : status === "ERROR" ? "bg-red-500" : "bg-zinc-400"}`} />
      {status === "CONNECTED" ? "Conectado" :
       status === "DISCONNECTED" ? "Desconectado" :
       status === "PENDING" ? "Pendente" :
       status === "ERROR" ? "Erro" : "Revogado"}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function OraclePage() {
  const [sources, setSources] = useState<HealthSource[]>([
    { id: "sim-1", platform: "SIMULATOR", status: "DISCONNECTED", lastSyncAt: null, scopes: [] },
    { id: "fit-1", platform: "FITBIT", status: "DISCONNECTED", lastSyncAt: null, scopes: [] },
    { id: "gar-1", platform: "GARMIN", status: "DISCONNECTED", lastSyncAt: null, scopes: [] },
    { id: "apl-1", platform: "APPLE_HEALTH", status: "DISCONNECTED", lastSyncAt: null, scopes: [] },
    { id: "gft-1", platform: "GOOGLE_FIT", status: "DISCONNECTED", lastSyncAt: null, scopes: [] },
    { id: "pol-1", platform: "POLAR", status: "DISCONNECTED", lastSyncAt: null, scopes: [] },
    { id: "amz-1", platform: "AMAZFIT", status: "DISCONNECTED", lastSyncAt: null, scopes: [] },
    { id: "sam-1", platform: "SAMSUNG_HEALTH", status: "DISCONNECTED", lastSyncAt: null, scopes: [] },
  ]);

  const [syncing, setSyncing] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  function handleConnect(platform: string) {
    setSources((prev) =>
      prev.map((s) =>
        s.platform === platform
          ? { ...s, status: "CONNECTED" as ConnectionStatus }
          : s
      )
    );
  }

  function handleDisconnect(platform: string) {
    setSources((prev) =>
      prev.map((s) =>
        s.platform === platform
          ? { ...s, status: "DISCONNECTED" as ConnectionStatus, lastSyncAt: null }
          : s
      )
    );
  }

  async function handleSync(platform: string) {
    setSyncing(platform);
    // Simulate async sync
    await new Promise((r) => setTimeout(r, 1200));
    const result: SyncResult = {
      jobId: `job-${Date.now()}`,
      rawCount: 42,
      normalizedCount: 40,
      errorCount: 2,
      status: "PARTIAL",
    };
    setLastResult(result);
    setSources((prev) =>
      prev.map((s) =>
        s.platform === platform
          ? { ...s, lastSyncAt: new Date().toISOString() }
          : s
      )
    );
    setSyncing(null);
  }

  const connected = sources.filter((s) => s.status === "CONNECTED");
  const disconnected = sources.filter((s) => s.status !== "CONNECTED");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 font-sans">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Oracle — Integrações de Saúde
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Conecte plataformas de saúde para sincronizar seus dados automaticamente.
          </p>
        </div>

        {/* Sync result toast */}
        {lastResult && (
          <div className={`rounded-lg border p-4 text-sm ${lastResult.status === "COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"}`}>
            <div className="flex items-center justify-between">
              <span>
                Sync concluído — {lastResult.normalizedCount} registros válidos,{" "}
                {lastResult.errorCount} erros.
              </span>
              <button
                onClick={() => setLastResult(null)}
                className="text-current opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Connected platforms */}
        {connected.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Conectados ({connected.length})
            </h2>
            <div className="space-y-2">
              {connected.map((source) => (
                <div
                  key={source.platform}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {PLATFORM_LABELS[source.platform] ?? source.platform}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Último sync: {formatDate(source.lastSyncAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={source.status} />
                    <button
                      onClick={() => handleSync(source.platform)}
                      disabled={syncing === source.platform}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {syncing === source.platform ? "Sincronizando…" : "Sync agora"}
                    </button>
                    <button
                      onClick={() => handleDisconnect(source.platform)}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      Desconectar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Available platforms */}
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Plataformas disponíveis
          </h2>
          <div className="space-y-2">
            {disconnected.map((source) => (
              <div
                key={source.platform}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {PLATFORM_LABELS[source.platform] ?? source.platform}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Não conectado
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={source.status} />
                  <button
                    onClick={() => handleConnect(source.platform)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-50 dark:hover:text-zinc-50"
                  >
                    Conectar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Info footer */}
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-600">
          Tokens de acesso são armazenados com criptografia AES-256-GCM.
          Seus dados nunca são compartilhados com terceiros.
        </p>
      </div>
    </div>
  );
}

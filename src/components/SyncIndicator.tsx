"use client";

import { useSync } from "@/hooks/useSync";

export function SyncIndicator() {
  const { pendingCount, syncing, isOnline, doSync } = useSync();

  return (
    <div className="flex items-center gap-2">
      {/* Online/Offline dot */}
      <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} />

      {pendingCount > 0 && (
        <button
          onClick={doSync}
          disabled={syncing || !isOnline}
          className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full"
        >
          {syncing ? (
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
        </button>
      )}

      {!isOnline && (
        <span className="text-xs text-red-600 font-medium">Sin conexión</span>
      )}
    </div>
  );
}

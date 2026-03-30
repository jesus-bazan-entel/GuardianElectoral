"use client";

import { useEffect, useCallback, useState } from "react";
import { syncAll, getPendingCount } from "@/lib/sync";
import { useOnlineStatus } from "./useOnlineStatus";

export function useSync() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const doSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncAll();
    } finally {
      setSyncing(false);
      await refreshCount();
    }
  }, [syncing, refreshCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      doSync();
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh pending count periodically
  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 5000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  return { pendingCount, syncing, isOnline, doSync, refreshCount };
}

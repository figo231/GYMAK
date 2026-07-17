import { useEffect, useState } from "react";
import { syncManager } from "../lib/sync/syncManager";

export function useSyncStatus() {
  const [snapshot, setSnapshot] = useState(() => syncManager.getSnapshot());

  useEffect(() => {
    return syncManager.subscribe(setSnapshot);
  }, []);

  return { ...snapshot, syncNow: () => syncManager.manualSync() };
}

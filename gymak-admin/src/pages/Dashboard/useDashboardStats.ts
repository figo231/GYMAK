import { useQuery } from "@tanstack/react-query";

export interface DashboardStats {
  totalUsers: number;
  activeDevices: number;
  activePushTokens: number;
  campaigns: number;
  deliveryRatePercent: number;
}

/**
 * Placeholder implementation for Sprint 11.1 — Dashboard Home ships with
 * static widget values (per scope: "Dashboard Home should display
 * placeholder widgets only"). Structured as a React Query hook already so
 * a later mini-sprint can replace the resolver body with real Supabase
 * queries against profiles / push_tokens / notifications /
 * notification_deliveries without touching Dashboard.tsx at all.
 */
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats-placeholder"],
    queryFn: async () => {
      return {
        totalUsers: 0,
        activeDevices: 0,
        activePushTokens: 0,
        campaigns: 0,
        deliveryRatePercent: 0,
      };
    },
    staleTime: Infinity,
  });
}

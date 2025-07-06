import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types";

interface AdminDashboardStats {
  current: {
    totalDemands: number;
    completedTasks: number;
    delayedDemands: number;
    totalUsers: number;
  };
  changes: {
    totalDemands: number;
    completedTasks: number;
    delayedDemands: number;
  };
}

interface UserDashboardStats {
  assignedDemands: number;
  completedTasksMonth: number;
  totalHoursMonth: number;
  totalCostMonth: number;
  totalCostWeek: number;
}

type DashboardStats = AdminDashboardStats | UserDashboardStats;

const fetchDashboardStats = async (profile: Profile | null): Promise<DashboardStats | null> => {
  if (!profile) return null;

  const functionName =
    profile.role === "admin" || profile.role === "supervisor"
      ? "get-dashboard-stats"
      : "get-user-dashboard-stats";

  const { data, error } = await supabase.functions.invoke(functionName);

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const useDashboardStats = (profile: Profile | null) => {
  return useQuery<DashboardStats | null, Error>({
    queryKey: ["dashboardStats", profile?.id],
    queryFn: () => fetchDashboardStats(profile),
    enabled: !!profile,
  });
};
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "react-day-picker";

interface UserReportData {
  user_id: string;
  full_name: string;
  total_hours: number;
  total_cost: number;
  task_count: number;
}

const fetchUserWorkReport = async (date: DateRange | undefined): Promise<UserReportData[]> => {
  if (!date?.from || !date?.to) {
    return [];
  }

  const adjustedStartDate = new Date(date.from);
  adjustedStartDate.setHours(0, 0, 0, 0);

  const adjustedEndDate = new Date(date.to);
  adjustedEndDate.setHours(23, 59, 59, 999);

  const { data, error } = await supabase.functions.invoke("get-user-work-report", {
    body: {
      startDate: adjustedStartDate.toISOString(),
      endDate: adjustedEndDate.toISOString(),
    },
  });

  if (error) {
    throw new Error(error.message);
  }
  return data.report || [];
};

export const useUserWorkReport = (date: DateRange | undefined) => {
  return useQuery<UserReportData[], Error>({
    queryKey: ["userWorkReport", date],
    queryFn: () => fetchUserWorkReport(date),
    enabled: !!date?.from && !!date?.to,
  });
};
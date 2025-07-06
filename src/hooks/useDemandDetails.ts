import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Demand, Task, MaterialCost } from "@/types";

export interface DemandDetailsData {
  demand: Demand;
  tasks: Task[];
  materialCosts: MaterialCost[];
}

const fetchDemandDetails = async (id: string | undefined): Promise<DemandDetailsData | null> => {
  if (!id) return null;

  const [demandResult, tasksResult, costsResult] = await Promise.all([
    supabase.from("demands").select("*, locations(*)").eq("id", id).single(),
    supabase.from("tasks").select("*, profiles!left(*)").eq("demand_id", id).order("created_at", { ascending: true }),
    supabase.from("material_costs").select("*").eq("demand_id", id)
  ]);

  if (demandResult.error) throw demandResult.error;
  if (tasksResult.error) throw tasksResult.error;
  if (costsResult.error) {
    console.error("Could not fetch material costs", costsResult.error);
  }

  const demand = demandResult.data;
  const tasks = tasksResult.data || [];
  const materialCosts = costsResult.data || [];

  const signedTasks = await Promise.all(
    tasks.map(async (task) => {
      let signed_start_photo_url = null;
      if (task.start_photo_url) {
        const { data } = await supabase.storage.from('task-photos').createSignedUrl(task.start_photo_url, 3600);
        signed_start_photo_url = data?.signedUrl;
      }
      let signed_end_photo_url = null;
      if (task.end_photo_url) {
        const { data } = await supabase.storage.from('task-photos').createSignedUrl(task.end_photo_url, 3600);
        signed_end_photo_url = data?.signedUrl;
      }
      return { ...task, signed_start_photo_url, signed_end_photo_url };
    })
  );

  return { demand, tasks: signedTasks, materialCosts };
};

export const useDemandDetails = (id: string | undefined) => {
  return useQuery<DemandDetailsData | null, Error>({
    queryKey: ["demandDetails", id],
    queryFn: () => fetchDemandDetails(id),
    enabled: !!id,
  });
};
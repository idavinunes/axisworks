import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Location } from "@/types";

const fetchLocationDetails = async (id: string | undefined): Promise<Location | null> => {
  if (!id) return null;

  const { data, error } = await supabase
    .from("locations")
    .select("*, demands(*, tasks(*), demand_workers(worker_id))")
    .eq("id", id)
    .order('start_date', { foreignTable: 'demands', ascending: false })
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const useLocationDetails = (id: string | undefined) => {
  return useQuery<Location | null, Error>({
    queryKey: ["locationDetails", id],
    queryFn: () => fetchLocationDetails(id),
    enabled: !!id,
  });
};
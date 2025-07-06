import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Location } from "@/types";

const fetchLocations = async (): Promise<Location[]> => {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data || [];
};

export const useLocations = () => {
  return useQuery<Location[], Error>({
    queryKey: ["locations"],
    queryFn: fetchLocations,
  });
};
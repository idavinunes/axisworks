import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types";

const fetchWorkers = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['user', 'supervisor']);
  
  if (error) {
    throw new Error(error.message);
  }
  return data || [];
};

export const useWorkers = () => {
  return useQuery<Profile[], Error>({
    queryKey: ["workers"],
    queryFn: fetchWorkers,
  });
};
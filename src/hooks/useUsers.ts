import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types";

const fetchUsers = async (): Promise<Profile[]> => {
  const { data, error } = await supabase.functions.invoke("get-users-with-status");
  if (error) {
    throw new Error(error.message);
  }
  return data.users || [];
};

export const useUsers = () => {
  return useQuery<Profile[], Error>({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });
};
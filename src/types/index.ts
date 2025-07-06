export type UserRole = "admin" | "supervisor" | "user";

export type TaskStatus = "pending" | "in_progress" | "pending_approval" | "approved";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  email: string;
  is_confirmed: boolean;
  hourly_cost?: number;
}

export interface Location {
  id:string;
  user_id: string;
  client_name: string;
  street_number: string | null;
  street_name: string | null;
  unit_number?: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  created_at: string;
  demands?: Demand[];
}

export interface MaterialCost {
  id: string;
  demand_id: string;
  description: string;
  amount: number;
  created_at: string;
  user_id: string;
}

export interface Demand {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  status: string;
  tasks?: Task[];
  location_id: string | null;
  locations: Location | null; // This can be simplified later if not needed
  start_date?: string | null;
  demand_workers: { worker_id: string }[];
  material_costs?: MaterialCost[];
}

export interface Task {
  id:string;
  demand_id: string;
  title: string;
  status: TaskStatus;
  start_photo_url: string | null;
  end_photo_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  signed_start_photo_url?: string;
  signed_end_photo_url?: string;
  presumed_hours: number | null;
  worker_id: string | null;
  profiles?: Profile | null; // Para o JOIN com os dados do trabalhador
}
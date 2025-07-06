export interface Employee {
  id: string;
  name: string;
  role: string;
}

export type UserRole = "admin" | "supervisor" | "user";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
}

export interface Demand {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  status: string;
  tasks?: Task[];
}

export interface Task {
  id: string;
  demand_id: string;
  title: string;
  is_completed: boolean;
  duration_seconds: number;
  photo_url: string | null;
  created_at: string;
}
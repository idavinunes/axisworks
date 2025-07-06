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
import { Task } from "@/types";

export const calculateTotalDuration = (tasks: Task[] | undefined | null): number => {
  if (!tasks) return 0;
  
  return tasks.reduce((acc, task) => {
    if (task.started_at && task.completed_at) {
      const start = new Date(task.started_at).getTime();
      const end = new Date(task.completed_at).getTime();
      return acc + Math.floor((end - start) / 1000);
    }
    return acc;
  }, 0);
};

export const formatTotalTime = (totalSeconds: number): string => {
  if (totalSeconds < 1) return "0m";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};
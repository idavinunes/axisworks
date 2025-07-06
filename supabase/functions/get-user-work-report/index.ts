import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserReport {
  user_id: string;
  full_name: string;
  total_hours: number;
  total_cost: number;
  task_count: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { startDate, endDate } = await req.json();
    if (!startDate || !endDate) {
      throw new Error("As datas de início e fim são obrigatórias.");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Buscar tarefas aprovadas no período com os dados do perfil do trabalhador
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        started_at,
        completed_at,
        worker_id,
        profiles (
          full_name,
          hourly_cost
        )
      `)
      .eq('status', 'approved') // Alterado de is_completed para status
      .gte('completed_at', startDate)
      .lte('completed_at', endDate);

    if (error) {
      throw new Error(`Erro ao buscar tarefas: ${error.message}`);
    }

    // Agrupar e calcular os totais por usuário
    const reportMap = new Map<string, UserReport>();

    for (const task of tasks) {
      if (!task.worker_id || !task.profiles) continue;

      const start = new Date(task.started_at!).getTime();
      const end = new Date(task.completed_at!).getTime();
      const hoursWorked = (end - start) / (1000 * 60 * 60);
      const cost = hoursWorked * (task.profiles.hourly_cost || 0);

      if (reportMap.has(task.worker_id)) {
        const existing = reportMap.get(task.worker_id)!;
        existing.total_hours += hoursWorked;
        existing.total_cost += cost;
        existing.task_count += 1;
      } else {
        reportMap.set(task.worker_id, {
          user_id: task.worker_id,
          full_name: task.profiles.full_name,
          total_hours: hoursWorked,
          total_cost: cost,
          task_count: 1,
        });
      }
    }

    const report = Array.from(reportMap.values());

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Usuário não autenticado.");
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Ajusta para segunda-feira
    startOfWeek.setHours(0, 0, 0, 0);

    // Buscar perfil do usuário para obter o custo por hora
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('hourly_cost')
      .eq('id', user.id)
      .single();

    if (profileError) throw new Error(`Erro ao buscar perfil: ${profileError.message}`);
    const hourlyCost = profile?.hourly_cost || 0;

    // Buscar todas as tarefas completas do usuário no mês corrente
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('started_at, completed_at')
      .eq('worker_id', user.id)
      .eq('is_completed', true)
      .gte('completed_at', startOfMonth.toISOString());

    if (tasksError) throw new Error(`Erro ao buscar tarefas: ${tasksError.message}`);

    let totalHoursMonth = 0;
    let totalHoursWeek = 0;

    tasks.forEach(task => {
      const completedAt = new Date(task.completed_at!);
      const startedAt = new Date(task.started_at!);
      const hoursWorked = (completedAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60);
      
      totalHoursMonth += hoursWorked;

      if (completedAt >= startOfWeek) {
        totalHoursWeek += hoursWorked;
      }
    });

    const totalCostMonth = totalHoursMonth * hourlyCost;
    const totalCostWeek = totalHoursWeek * hourlyCost;

    // Contar total de demandas atribuídas ao usuário
    const { count: assignedDemands, error: demandsError } = await supabase
      .from('demand_workers')
      .select('*', { count: 'exact', head: true })
      .eq('worker_id', user.id);

    if (demandsError) throw new Error(`Erro ao contar demandas: ${demandsError.message}`);

    const stats = {
      assignedDemands: assignedDemands || 0,
      completedTasksMonth: tasks.length,
      totalHoursMonth,
      totalCostMonth,
      totalCostWeek,
    };

    return new Response(JSON.stringify(stats), {
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
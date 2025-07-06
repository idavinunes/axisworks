import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MonthlyStats {
  totalDemands: number;
  completedTasks: number;
  delayedDemands: number;
  totalUsers: number;
}

// Helper para calcular a mudança percentual
const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

// Função principal para buscar dados de um período
async function getStatsForPeriod(supabase: SupabaseClient, startDate: string, endDate: string): Promise<Omit<MonthlyStats, 'totalUsers'>> {
  // Total de demandas criadas no período
  const { count: totalDemands, error: demandsError } = await supabase
    .from('demands')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate)
    .lt('created_at', endDate);
  if (demandsError) throw new Error(`Erro ao buscar demandas: ${demandsError.message}`);

  // Total de tarefas aprovadas no período
  const { count: completedTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved') // Alterado de is_completed para status
    .gte('completed_at', startDate)
    .lt('completed_at', endDate);
  if (tasksError) throw new Error(`Erro ao buscar tarefas: ${tasksError.message}`);

  // Demandas que deveriam ter começado no período mas não têm tarefas iniciadas
  const { data: delayedDemandsData, error: delayedDemandsError } = await supabase
    .from('demands')
    .select('id, tasks!inner(id, started_at)')
    .gte('start_date', startDate.split('T')[0])
    .lt('start_date', endDate.split('T')[0])
    .is('tasks.started_at', null)

  if (delayedDemandsError) throw new Error(`Erro ao buscar demandas atrasadas: ${delayedDemandsError.message}`);
  
  // Filtra para garantir que NENHUMA tarefa da demanda foi iniciada
  const delayedDemands = delayedDemandsData?.filter(d => d.tasks.every(t => t.started_at === null)).length || 0;

  return {
    totalDemands: totalDemands || 0,
    completedTasks: completedTasks || 0,
    delayedDemands: delayedDemands,
  };
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

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month

    const currentMonthStats = await getStatsForPeriod(supabase, startOfCurrentMonth.toISOString(), now.toISOString());
    const previousMonthStats = await getStatsForPeriod(supabase, startOfPreviousMonth.toISOString(), startOfCurrentMonth.toISOString());

    // Total de usuários (não é por período)
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    if (usersError) throw new Error(`Erro ao buscar usuários: ${usersError.message}`);

    const fullCurrentStats: MonthlyStats = { ...currentMonthStats, totalUsers: totalUsers || 0 };

    const changes = {
      totalDemands: calculatePercentageChange(currentMonthStats.totalDemands, previousMonthStats.totalDemands),
      completedTasks: calculatePercentageChange(currentMonthStats.completedTasks, previousMonthStats.completedTasks),
      delayedDemands: calculatePercentageChange(currentMonthStats.delayedDemands, previousMonthStats.delayedDemands),
    };

    return new Response(JSON.stringify({ current: fullCurrentStats, changes }), {
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
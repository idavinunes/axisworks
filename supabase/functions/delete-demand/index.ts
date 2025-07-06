import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função para deletar todas as fotos de uma lista de tarefas
async function deletePhotosForTasks(supabase: SupabaseClient, tasks: { id: string }[]) {
  if (!tasks || tasks.length === 0) {
    return;
  }

  const filesToRemove: string[] = [];
  for (const task of tasks) {
    const folderPath = `${task.id}/`;
    const { data: fileList, error: listError } = await supabase.storage
      .from('task-photos')
      .list(folderPath);

    if (listError) {
      console.error(`Erro ao listar arquivos para a tarefa ${task.id}:`, listError.message);
      continue; // Pula para a próxima tarefa
    }

    if (fileList && fileList.length > 0) {
      const taskFiles = fileList.map(file => `${folderPath}${file.name}`);
      filesToRemove.push(...taskFiles);
    }
  }

  if (filesToRemove.length > 0) {
    const { error: removeError } = await supabase.storage
      .from('task-photos')
      .remove(filesToRemove);
    if (removeError) {
      throw new Error(`Falha ao remover fotos do storage: ${removeError.message}`);
    }
  }
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

    const { demand_id } = await req.json();
    if (!demand_id) {
      throw new Error("O ID da demanda é obrigatório.");
    }

    // 1. Encontrar todas as tarefas associadas à demanda
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .eq('demand_id', demand_id);

    if (tasksError) {
      throw new Error(`Erro ao buscar tarefas: ${tasksError.message}`);
    }

    // 2. Deletar todas as fotos associadas a essas tarefas
    await deletePhotosForTasks(supabase, tasks);

    // 3. Deletar todos os registros de tarefas (o cascade faria isso, mas é mais seguro fazer explicitamente)
    const { error: deleteTasksError } = await supabase
      .from('tasks')
      .delete()
      .eq('demand_id', demand_id);

    if (deleteTasksError) {
      throw new Error(`Erro ao deletar tarefas: ${deleteTasksError.message}`);
    }

    // 4. Deletar a demanda
    const { error: deleteDemandError } = await supabase
      .from('demands')
      .delete()
      .eq('id', demand_id);

    if (deleteDemandError) {
      throw new Error(`Erro ao deletar a demanda: ${deleteDemandError.message}`);
    }

    return new Response(JSON.stringify({ message: "Demanda deletada com sucesso!" }), {
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
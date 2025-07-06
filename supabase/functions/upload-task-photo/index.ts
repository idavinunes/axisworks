import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função para verificar se o usuário está autorizado a gerenciar a tarefa
async function isUserAuthorized(supabase: SupabaseClient, userId: string, taskId: string) {
  // Primeiro, verifica se o usuário é admin ou supervisor
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Erro ao buscar perfil:', profileError.message);
    return false;
  }

  if (profile.role === 'admin' || profile.role === 'supervisor') {
    return true;
  }

  // Se não for admin/supervisor, verifica se está atribuído à demanda
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('demand_id, demands!inner(user_id, demand_workers!inner(worker_id))')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    console.error('Erro ao buscar tarefa ou tarefa não encontrada:', taskError?.message);
    return false;
  }

  // Verifica se o usuário é o criador da demanda
  if (task.demands.user_id === userId) {
    return true;
  }

  // Verifica se o usuário é um trabalhador atribuído
  const isAssigned = task.demands.demand_workers.some(worker => worker.worker_id === userId);
  if (isAssigned) {
    return true;
  }

  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Cria um cliente Supabase com a chave de serviço para privilégios de administrador
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Obtém o usuário a partir do cabeçalho de autorização
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user } } = await createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (!user) {
      throw new Error("Usuário não autenticado.");
    }

    const formData = await req.formData();
    const photo = formData.get('photo');
    const taskId = formData.get('taskId') as string;
    const photoAction = formData.get('photoAction') as string;

    if (!photo || !taskId || !photoAction) {
      throw new Error("Faltando foto, ID da tarefa ou ação da foto na requisição.");
    }

    // Autoriza o usuário
    const authorized = await isUserAuthorized(supabaseAdmin, user.id, taskId);
    if (!authorized) {
        throw new Error("Usuário não autorizado para fazer upload de fotos para esta tarefa.");
    }

    const fileName = `${taskId}/${photoAction}_${Date.now()}.jpg`;

    // Faz o upload do arquivo usando o cliente admin (ignora RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('task-photos')
      .upload(fileName, photo, {
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      throw new Error(`Erro no upload para o armazenamento: ${uploadError.message}`);
    }

    return new Response(JSON.stringify({ path: uploadData.path }), {
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
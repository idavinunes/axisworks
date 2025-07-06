import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função para verificar se o usuário está autorizado a gerenciar a tarefa
async function isUserAuthorized(supabase: SupabaseClient, userId: string, taskId: string): Promise<boolean> {
  // 1. Verifica se o usuário é admin ou supervisor
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error(`Erro de autorização (verificação de perfil): ${profileError.message}`);
    return false;
  }

  if (profile.role === 'admin' || profile.role === 'supervisor') {
    return true;
  }

  // 2. Obtém o demand_id da tarefa
  const { data: taskData, error: taskError } = await supabase
    .from('tasks')
    .select('demand_id')
    .eq('id', taskId)
    .single();

  if (taskError || !taskData) {
    console.error(`Erro de autorização (tarefa não encontrada): ${taskError?.message || 'Tarefa não encontrada'}`);
    return false;
  }

  // 3. Obtém o dono da demanda e os trabalhadores atribuídos
  const { data: demandData, error: demandError } = await supabase
    .from('demands')
    .select('user_id, demand_workers(worker_id)')
    .eq('id', taskData.demand_id)
    .single();
  
  if (demandError || !demandData) {
    console.error(`Erro de autorização (demanda não encontrada): ${demandError?.message || 'Demanda não encontrada'}`);
    return false;
  }

  // 4. Verifica se o usuário é o dono da demanda
  if (demandData.user_id === userId) {
    return true;
  }

  // 5. Verifica se o usuário é um trabalhador atribuído
  if (demandData.demand_workers && demandData.demand_workers.some(worker => worker.worker_id === userId)) {
    return true;
  }

  // 6. Se nenhuma das opções acima, o usuário não está autorizado
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
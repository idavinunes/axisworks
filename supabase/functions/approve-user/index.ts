import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Crie um cliente Supabase com a Chave de Serviço (privilégios de administrador)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 2. Obtenha o JWT do cabeçalho de autorização para identificar quem está fazendo a chamada
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Cabeçalho de autorização ausente.");
    }
    const jwt = authHeader.replace('Bearer ', '');

    // 3. Obtenha os dados do usuário que está fazendo a chamada a partir do JWT
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !user) {
      throw new Error("Usuário não autenticado ou token inválido.");
    }

    // 4. Verifique se o usuário que está chamando a função é um administrador ou supervisor
    const { data: callerProfile, error: callerError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerError || !callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'supervisor')) {
      throw new Error("Acesso negado. Somente administradores ou supervisores podem aprovar usuários.");
    }

    // 5. Obtenha o ID do usuário a ser aprovado do corpo da requisição
    const { user_id } = await req.json();
    if (!user_id) {
      throw new Error("O ID do usuário é obrigatório.");
    }

    // 6. Atualize o status do usuário para 'active'
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', user_id);

    if (updateError) {
      throw new Error(`Erro ao aprovar usuário: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ message: "Usuário aprovado com sucesso!" }), {
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
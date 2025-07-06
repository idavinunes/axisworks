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
    const { email, password, full_name, role, hourly_cost } = await req.json();
    if (!email || !password || !full_name || !role) {
      throw new Error("Email, senha, nome completo e perfil são obrigatórios.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Criar o usuário no Auth sem enviar e-mail de confirmação
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError) {
      throw new Error(`Erro ao criar usuário no sistema de autenticação: ${authError.message}`);
    }

    const newUser = authData.user;
    if (!newUser) {
      throw new Error("A criação do usuário não retornou um usuário válido.");
    }

    // 2. O trigger 'handle_new_user' já criou o perfil. Agora, atualizamos com role, custo e o status 'pending'.
    const parsedCost = parseFloat(hourly_cost);
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role: role,
        hourly_cost: !isNaN(parsedCost) ? parsedCost : 0, // CORRIGIDO: Converte o valor para número
        status: 'pending'
      })
      .eq('id', newUser.id);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      throw new Error(`Erro ao definir o perfil do usuário: ${profileError.message}`);
    }

    return new Response(JSON.stringify({ message: "Usuário criado com sucesso e aguardando aprovação.", user: newUser }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error)_ {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
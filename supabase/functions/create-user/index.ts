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
    const { email, password, full_name, role } = await req.json();
    if (!email || !password || !full_name || !role) {
      throw new Error("Email, senha, nome completo e perfil são obrigatórios.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Criar o usuário no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // O usuário não precisará confirmar o e-mail
      user_metadata: { full_name },
    });

    if (authError) {
      throw new Error(`Erro ao criar usuário no sistema de autenticação: ${authError.message}`);
    }

    const newUser = authData.user;
    if (!newUser) {
      throw new Error("A criação do usuário não retornou um usuário válido.");
    }

    // 2. O trigger 'handle_new_user' já criou o perfil com o nome completo e o role padrão ('user').
    //    Agora, se o role for diferente de 'user', atualizamos o perfil.
    if (role !== 'user') {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ role: role })
        .eq('id', newUser.id);

      if (profileError) {
        // Se a atualização do perfil falhar, é uma boa prática deletar o usuário recém-criado para evitar inconsistências.
        await supabaseAdmin.auth.admin.deleteUser(newUser.id);
        throw new Error(`Erro ao definir o perfil do usuário: ${profileError.message}`);
      }
    }

    return new Response(JSON.stringify({ message: "Usuário criado com sucesso!", user: newUser }), {
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
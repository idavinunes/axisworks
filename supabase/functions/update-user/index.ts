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
    const { user_id, full_name, role, password, hourly_cost } = await req.json();
    if (!user_id || !full_name || !role) {
      throw new Error("ID do usuário, nome completo e perfil são obrigatórios.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Atualiza os dados de autenticação
    const authUpdatePayload: { password?: string; user_metadata?: { full_name: string } } = {
        user_metadata: { full_name }
    };
    if (password) {
      authUpdatePayload.password = password;
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      authUpdatePayload
    );

    if (authError) {
      throw new Error(`Erro ao atualizar dados de autenticação: ${authError.message}`);
    }

    // 2. Atualiza o perfil público dinamicamente
    const profileUpdatePayload: { [key: string]: any } = {
      full_name,
      role,
    };

    // CORRIGIDO: Apenas adiciona o custo/hora se for um número válido
    if (hourly_cost !== undefined && hourly_cost !== null) {
        const parsedCost = parseFloat(hourly_cost);
        if (!isNaN(parsedCost)) {
            profileUpdatePayload.hourly_cost = parsedCost;
        }
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdatePayload)
      .eq('id', user_id);

    if (profileError) {
      throw new Error(`Erro ao atualizar o perfil público: ${profileError.message}`);
    }

    return new Response(JSON.stringify({ message: "Usuário atualizado com sucesso!", user: authData.user }), {
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
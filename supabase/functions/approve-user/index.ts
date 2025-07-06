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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Verificar se o chamador é admin ou supervisor
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const { data: callerProfile, error: callerError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerError || !callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'supervisor')) {
      throw new Error("Acesso negado. Somente administradores ou supervisores podem aprovar usuários.");
    }

    const { user_id } = await req.json();
    if (!user_id) {
      throw new Error("O ID do usuário é obrigatório.");
    }

    // Atualizar o status do usuário para 'active'
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
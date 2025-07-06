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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Buscar todos os usuários do Auth
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw new Error(`Erro ao buscar usuários do Auth: ${authError.message}`);

    // 2. Buscar todos os perfis da tabela public
    const { data: profiles, error: profilesError } = await supabaseAdmin.from('profiles').select('*');
    if (profilesError) throw new Error(`Erro ao buscar perfis: ${profilesError.message}`);

    // 3. Combinar os dados
    const profilesMap = new Map(profiles.map(p => [p.id, p]));

    const combinedUsers = authUsers.map(user => {
      const profile = profilesMap.get(user.id);
      return {
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Nome não definido',
        email: user.email,
        role: profile?.role || 'user',
        is_confirmed: !!user.email_confirmed_at,
      };
    });

    return new Response(JSON.stringify({ users: combinedUsers }), {
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
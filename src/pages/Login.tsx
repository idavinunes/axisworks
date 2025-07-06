import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';

const Login = () => {
  const navigate = useNavigate();
  const { session } = useSession();

  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Sistema de Ponto</h1>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          theme="light"
          localization={{
            variables: {
              sign_in: {
                email_label: 'Seu e-mail',
                password_label: 'Sua senha',
                button_label: 'Entrar',
                link_text: 'Já tem uma conta? Entre',
              },
              sign_up: {
                email_label: 'Seu e-mail',
                password_label: 'Crie uma senha',
                button_label: 'Criar conta',
                link_text: "Não tem uma conta? Crie uma",
                email_input_placeholder: 'seu@email.com',
                password_input_placeholder: 'Sua senha segura',
              },
              forgotten_password: {
                email_label: 'Seu e-mail',
                button_label: 'Enviar instruções',
                link_text: 'Esqueceu a senha?',
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default Login;
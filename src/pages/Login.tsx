import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';

const translations = {
  pt: {
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
    title: 'Sistema de Ponto',
  },
  en: {
    sign_in: {
      email_label: 'Your email',
      password_label: 'Your password',
      button_label: 'Sign In',
      link_text: 'Already have an account? Sign In',
    },
    sign_up: {
      email_label: 'Your email',
      password_label: 'Create a password',
      button_label: 'Create account',
      link_text: "Don't have an account? Sign Up",
      email_input_placeholder: 'your@email.com',
      password_input_placeholder: 'Your secure password',
    },
    forgotten_password: {
      email_label: 'Your email',
      button_label: 'Send instructions',
      link_text: 'Forgot your password?',
    },
    title: 'Time Clock System',
  }
};


const Login = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const [language, setLanguage] = useState<'pt' | 'en'>('pt');

  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  const t = translations[language];

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <div className="flex gap-2">
            <Button variant={language === 'pt' ? 'default' : 'outline'} size="sm" onClick={() => setLanguage('pt')}>PT</Button>
            <Button variant={language === 'en' ? 'default' : 'outline'} size="sm" onClick={() => setLanguage('en')}>EN</Button>
          </div>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          theme="light"
          localization={{
            variables: t,
          }}
        />
      </div>
    </div>
  );
};

export default Login;
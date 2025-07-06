import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';

const Header = () => {
  const { user, profile } = useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    } else {
      navigate('/login');
    }
  };

  return (
    <header className="flex justify-between items-center p-4 border-b bg-card">
      <h1 className="text-xl font-bold">Sistema de Ponto</h1>
      {user && (
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-semibold">{profile?.full_name || user.email}</p>
            <p className="text-sm text-muted-foreground capitalize">{profile?.role}</p>
          </div>
          <Button variant="outline" size="icon" onClick={handleLogout} title="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
    </header>
  );
};

export default Header;
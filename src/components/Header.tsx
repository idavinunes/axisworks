import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { LogOut, Menu, Briefcase } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Nav } from './Nav';
import { useState } from 'react';

const Header = () => {
  const { user, profile } = useSession();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    } else {
      navigate('/login');
    }
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu de navegação</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
           <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <a href="/" className="flex items-center gap-2 font-semibold">
              <Briefcase className="h-6 w-6" />
              <span className="">Sistema de Ponto</span>
            </a>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <Nav profile={profile} onLinkClick={() => setIsMobileMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="w-full flex-1">
        {/* Espaço para futuras adições como busca ou breadcrumbs */}
      </div>

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
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { LogOut, Menu, Briefcase, Sun, Moon } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Nav } from './Nav';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { showError } from '@/utils/toast';
import { useTheme } from 'next-themes';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

const Header = () => {
  const { user, profile } = useSession();
  const queryClient = useQueryClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { setTheme } = useTheme();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    queryClient.clear(); // Limpa o cache do react-query para remover dados do usuário
    
    // Ignora o erro "Auth session missing!", pois o usuário já está efetivamente deslogado.
    if (error && error.message !== 'Auth session missing!') {
      console.error("Error logging out:", error);
      showError(`Erro ao sair: ${error.message}`);
    }
    // A navegação é tratada pelo ProtectedRoute, que reage à mudança no estado da sessão.
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
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Alternar tema</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Claro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Escuro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                Sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold">{profile?.full_name || user.email}</p>
              <p className="text-sm text-muted-foreground capitalize">{profile?.role}</p>
            </div>
            <Button variant="outline" size="icon" onClick={handleLogout} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
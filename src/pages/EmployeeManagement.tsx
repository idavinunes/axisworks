import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Profile, UserRole } from "@/types";
import { PlusCircle, UserCheck, Shield, User, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { useSession } from "@/contexts/SessionContext";
import { Link } from "react-router-dom";

const roleIcons: Record<UserRole, React.ReactNode> = {
  admin: <Shield className="h-5 w-5 text-red-500" />,
  supervisor: <UserCheck className="h-5 w-5 text-blue-500" />,
  user: <User className="h-5 w-5 text-muted-foreground" />,
};

const EmployeeManagement = () => {
  const { profile: currentUserProfile } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");

  const fetchProfiles = async () => {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) {
      showError("Falha ao carregar a lista de usuários.");
    } else {
      setProfiles(data || []);
    }
  };

  useEffect(() => {
    if (currentUserProfile) {
      fetchProfiles();
    }
  }, [currentUserProfile]);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("user");
  };

  const handleCreateUser = async () => {
    if (!fullName || !email || !password) {
      showError("Por favor, preencha todos os campos.");
      return;
    }
    setIsLoading(true);

    const { error } = await supabase.functions.invoke("create-user", {
      body: {
        full_name: fullName,
        email,
        password,
        role,
      },
    });

    setIsLoading(false);
    if (error) {
      showError(`Falha ao criar usuário: ${error.message}`);
    } else {
      showSuccess("Usuário criado com sucesso!");
      setIsDialogOpen(false);
      resetForm();
      fetchProfiles(); // Refresh the list
    }
  };

  if (currentUserProfile?.role !== 'admin' && currentUserProfile?.role !== 'supervisor') {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold text-destructive">Acesso Negado</h1>
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Voltar para o Início
      </Link>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciamento de Equipe</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados para cadastrar um novo membro na equipe.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex: João da Silva" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao.silva@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Perfil</Label>
                <Select onValueChange={(value: UserRole) => setRole(value)} defaultValue={role}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentUserProfile?.role === 'admin' && (
                      <>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                      </>
                    )}
                    <SelectItem value="user">Usuário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateUser} disabled={isLoading}>
                {isLoading ? "Salvando..." : "Salvar Usuário"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profiles.length > 0 ? (
          profiles.map((profile) => (
            <Card key={profile.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{profile.full_name}</CardTitle>
                {roleIcons[profile.role]}
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-muted-foreground capitalize">{profile.role}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <p>Nenhum usuário cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
};

export default EmployeeManagement;
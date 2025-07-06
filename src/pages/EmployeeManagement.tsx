import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Profile, UserRole } from "@/types";
import { PlusCircle, UserCheck, Shield, User, ArrowLeft, Pencil, DollarSign, CheckCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { useSession } from "@/contexts/SessionContext";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useUsers } from "@/hooks/useUsers";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const roleIcons: Record<UserRole, React.ReactNode> = {
  admin: <Shield className="h-5 w-5 text-red-500" />,
  supervisor: <UserCheck className="h-5 w-5 text-blue-500" />,
  user: <User className="h-5 w-5 text-muted-foreground" />,
};

const EmployeeManagement = () => {
  const { profile: currentUserProfile } = useSession();
  const queryClient = useQueryClient();
  const { data: profiles = [], isLoading: isLoadingProfiles, error: profilesError } = useUsers();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [hourlyCost, setHourlyCost] = useState("");

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("user");
    setHourlyCost("");
  };

  const handleOpenAddDialog = () => {
    setEditingProfile(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (profile: Profile) => {
    setEditingProfile(profile);
    setFullName(profile.full_name);
    setEmail(profile.email);
    setRole(profile.role);
    setHourlyCost(profile.hourly_cost?.toString() || "0");
    setPassword("");
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingProfile(null);
    resetForm();
  };

  const handleSubmit = () => {
    if (editingProfile) {
      handleUpdateUser();
    } else {
      handleCreateUser();
    }
  };

  const handleCreateUser = async () => {
    if (!fullName || !email || !password) {
      showError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    setIsSubmitting(true);

    const { error } = await supabase.functions.invoke("create-user", {
      body: { full_name: fullName, email, password, role, hourly_cost: parseFloat(hourlyCost) || 0 },
    });

    setIsSubmitting(false);
    if (error) {
      showError(`Falha ao criar usuário: ${error.message}`);
    } else {
      showSuccess("Usuário criado e aguardando aprovação!");
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleDialogClose();
    }
  };

  const handleUpdateUser = async () => {
    if (!editingProfile || !fullName) {
      showError("O nome completo é obrigatório.");
      return;
    }
    setIsSubmitting(true);

    const body: {
      user_id: string;
      full_name: string;
      role: UserRole;
      password?: string;
      hourly_cost?: number;
    } = {
      user_id: editingProfile.id,
      full_name: fullName,
      role,
    };

    if (password) {
      body.password = password;
    }

    const parsedHourlyCost = parseFloat(hourlyCost);
    if (!isNaN(parsedHourlyCost)) {
      body.hourly_cost = parsedHourlyCost;
    }

    const { error } = await supabase.functions.invoke("update-user", { body });

    setIsSubmitting(false);
    if (error) {
      showError(`Falha ao atualizar usuário: ${error.message}`);
    } else {
      showSuccess("Usuário atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleDialogClose();
    }
  };

  const handleApproveUser = async (userId: string) => {
    setIsSubmitting(true);
    const { error } = await supabase.functions.invoke("approve-user", {
      body: { user_id: userId },
    });
    setIsSubmitting(false);
    if (error) {
      showError(`Falha ao aprovar usuário: ${error.message}`);
    } else {
      showSuccess("Usuário aprovado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  };

  const filteredProfiles = profiles.filter(profile =>
    profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <Link to="/" className={cn(buttonVariants({ variant: "outline" }), "self-start")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para o Início
      </Link>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Gerenciamento de Equipe</h1>
        <Button onClick={handleOpenAddDialog} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Usuário
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingProfile ? "Editar Usuário" : "Adicionar Novo Usuário"}</DialogTitle>
            <DialogDescription>
              {editingProfile ? "Atualize os dados do usuário." : "Preencha os dados para cadastrar um novo membro."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex: João da Silva" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao.silva@email.com" disabled={!!editingProfile} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editingProfile ? "Deixe em branco para não alterar" : "••••••••"} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Perfil</Label>
                <Select onValueChange={(value: UserRole) => setRole(value)} value={role}>
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
              <div className="space-y-2">
                <Label htmlFor="hourlyCost">Custo/Hora ($)</Label>
                <Input id="hourlyCost" type="number" value={hourlyCost} onChange={(e) => setHourlyCost(e.target.value)} placeholder="Ex: 25.50" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoadingProfiles ? (
          [...Array(6)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : profilesError ? (
          <p className="col-span-full text-center text-destructive">Erro ao carregar usuários: {profilesError.message}</p>
        ) : filteredProfiles.length > 0 ? (
          filteredProfiles.map((profile) => (
            <Card key={profile.id}>
              <CardContent className="p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-grow">
                  <div className="flex-shrink-0">{roleIcons[profile.role]}</div>
                  <div className="flex-grow">
                    <p className="font-semibold leading-tight">{profile.full_name}</p>
                    <p className="text-xs text-muted-foreground break-all">{profile.email}</p>
                    {profile.hourly_cost && profile.hourly_cost > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        <span>{`$${profile.hourly_cost.toFixed(2)} / hora`}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <Badge variant={profile.status === 'active' ? 'default' : 'secondary'} className={cn("text-xs", profile.status === 'active' ? "bg-green-500 hover:bg-green-600" : "")}>
                    {profile.status === 'active' ? "Ativo" : "Pendente"}
                  </Badge>
                  {profile.status === 'pending' && (currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'supervisor') && (
                    <Button size="icon" className="h-7 w-7" onClick={() => handleApproveUser(profile.id)} disabled={isSubmitting}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {currentUserProfile?.role === 'admin' && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditDialog(profile)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="col-span-full text-center text-muted-foreground py-8">Nenhum usuário encontrado.</p>
        )}
      </div>
    </div>
  );
};

export default EmployeeManagement;
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, PlusCircle, ListChecks, Trash2 } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { Demand } from "@/types";

const Index = () => {
  const { profile, user } = useSession();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [isDemandDialogOpen, setIsDemandDialogOpen] = useState(false);
  const [newDemandTitle, setNewDemandTitle] = useState("");

  const fetchDemands = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("demands")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      showError("Erro ao buscar demandas.");
      console.error(error);
    } else {
      setDemands(data || []);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDemands();
    }
  }, [user]);

  const handleCreateDemand = async () => {
    if (!newDemandTitle.trim() || !user) return;
    const { error } = await supabase
      .from("demands")
      .insert({ title: newDemandTitle, user_id: user.id });

    if (error) {
      showError("Falha ao criar demanda.");
      console.error(error);
    } else {
      showSuccess("Demanda criada com sucesso!");
      setNewDemandTitle("");
      setIsDemandDialogOpen(false);
      fetchDemands();
    }
  };

  const handleDeleteDemand = async (demandId: string) => {
    const { error } = await supabase.functions.invoke('delete-demand', {
      body: { demand_id: demandId },
    });

    if (error) {
      showError(`Falha ao deletar demanda: ${error.message}`);
      console.error(error);
    } else {
      showSuccess("Demanda deletada com sucesso!");
      fetchDemands();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              <CardTitle>Minhas Demandas</CardTitle>
            </div>
            <Dialog open={isDemandDialogOpen} onOpenChange={setIsDemandDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> Criar Demanda
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Demanda</DialogTitle>
                  <DialogDescription>
                    Dê um nome para sua nova demanda para começar a adicionar tarefas.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Label htmlFor="demand-title">Título da Demanda</Label>
                  <Input
                    id="demand-title"
                    value={newDemandTitle}
                    onChange={(e) => setNewDemandTitle(e.target.value)}
                    placeholder="Ex: Instalação do cliente XPTO"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateDemand}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {demands.length > 0 ? (
            <ul className="space-y-2">
              {demands.map((demand) => (
                <li key={demand.id} className="border p-3 rounded-md flex justify-between items-center hover:bg-accent">
                  <Link to={`/demands/${demand.id}`} className="flex-grow flex justify-between items-center mr-4">
                    <span>{demand.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(demand.created_at).toLocaleDateString()}
                    </span>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive flex-shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso irá deletar permanentemente a demanda "{demand.title}", todas as suas tarefas e fotos associadas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteDemand(demand.id)} className="bg-destructive hover:bg-destructive/90">
                          Deletar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Você ainda não tem nenhuma demanda.
            </p>
          )}
        </CardContent>
      </Card>

      {profile?.role === "admin" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gerenciamento
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription>
              Cadastre e gerencie os funcionários da sua equipe.
            </CardDescription>
            <Button asChild className="mt-4">
              <Link to="/employees">Gerenciar Funcionários</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Index;
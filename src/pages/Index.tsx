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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, PlusCircle, ListChecks, Trash2, MapPin } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { Demand, Location } from "@/types";

const Index = () => {
  const { profile, user } = useSession();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isDemandDialogOpen, setIsDemandDialogOpen] = useState(false);
  const [newDemandTitle, setNewDemandTitle] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(undefined);

  const fetchDemandsAndLocations = async () => {
    if (!user) return;

    const { data: demandsData, error: demandsError } = await supabase
      .from("demands")
      .select("*, locations(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (demandsError) {
      showError("Erro ao buscar demandas.");
    } else {
      setDemands(demandsData || []);
    }

    const { data: locationsData, error: locationsError } = await supabase
      .from("locations")
      .select("*")
      .eq("user_id", user.id)
      .order("client_name", { ascending: true });

    if (locationsError) {
      showError("Erro ao buscar locais de trabalho.");
    } else {
      setLocations(locationsData || []);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDemandsAndLocations();
    }
  }, [user]);

  const handleCreateDemand = async () => {
    if (!newDemandTitle.trim() || !selectedLocationId || !user) {
      showError("Por favor, selecione um local e preencha o título da demanda.");
      return;
    }
    const { error } = await supabase
      .from("demands")
      .insert({
        title: newDemandTitle,
        user_id: user.id,
        location_id: selectedLocationId,
      });

    if (error) {
      showError("Falha ao criar demanda.");
    } else {
      showSuccess("Demanda criada com sucesso!");
      setNewDemandTitle("");
      setSelectedLocationId(undefined);
      setIsDemandDialogOpen(false);
      fetchDemandsAndLocations();
    }
  };

  const handleDeleteDemand = async (demandId: string) => {
    const { error } = await supabase.functions.invoke("delete-demand", {
      body: { demand_id: demandId },
    });

    if (error) {
      showError(`Falha ao deletar demanda: ${error.message}`);
    } else {
      showSuccess("Demanda deletada com sucesso!");
      fetchDemandsAndLocations();
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
                    Selecione o local e dê um nome para sua nova demanda.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Local de Trabalho</Label>
                    <Select onValueChange={setSelectedLocationId} value={selectedLocationId}>
                      <SelectTrigger id="location">
                        <SelectValue placeholder="Selecione um local..." />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.length > 0 ? (
                          locations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.client_name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            Nenhum local cadastrado.{" "}
                            <Link
                              to="/locations"
                              className="text-primary underline"
                              onClick={() => setIsDemandDialogOpen(false)}
                            >
                              Adicione um agora
                            </Link>
                            .
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demand-title">Título da Demanda</Label>
                    <Input
                      id="demand-title"
                      value={newDemandTitle}
                      onChange={(e) => setNewDemandTitle(e.target.value)}
                      placeholder="Ex: Instalação do cliente XPTO"
                    />
                  </div>
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
                <li
                  key={demand.id}
                  className="border p-3 rounded-md flex justify-between items-center hover:bg-accent"
                >
                  <Link to={`/demands/${demand.id}`} className="flex-grow mr-4">
                    <p>{demand.title}</p>
                    {demand.locations && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                        <MapPin className="h-3 w-3" />{" "}
                        {demand.locations.client_name}
                      </p>
                    )}
                  </Link>
                  <div className="flex items-center flex-shrink-0">
                    <span className="text-xs text-muted-foreground mr-2">
                      {new Date(demand.created_at).toLocaleDateString()}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso irá deletar
                            permanentemente a demanda "{demand.title}", todas as
                            suas tarefas e fotos associadas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteDemand(demand.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Deletar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Locais de Trabalho
          </CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <CardDescription>
            Gerencie os locais e endereços dos seus clientes.
          </CardDescription>
          <Button asChild className="mt-4">
            <Link to="/locations">Gerenciar Locais</Link>
          </Button>
        </CardContent>
      </Card>

      {profile?.role === "admin" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gerenciamento de Equipe
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
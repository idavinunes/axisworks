import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Location, Demand, Profile } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PlusCircle, ArrowLeft, Trash2, MapPin, Map, Clock, CalendarIcon, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatAddress, generateMapsUrl } from "@/utils/address";
import { calculateTotalDuration, formatTotalTime } from "@/utils/time";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSession } from "@/contexts/SessionContext";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocationDetails } from "@/hooks/useLocationDetails";
import { useWorkers } from "@/hooks/useWorkers";
import { Skeleton } from "@/components/ui/skeleton";

const AssignWorkerDialog = ({ demand, workers, onSave, open, onOpenChange }: { demand: Demand, workers: Profile[], onSave: () => void, open: boolean, onOpenChange: (open: boolean) => void }) => {
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (demand) {
      const initialAssignedIds = new Set(demand.demand_workers.map(dw => dw.worker_id));
      setSelectedWorkerIds(initialAssignedIds);
    }
  }, [demand]);

  const handleToggleWorker = (workerId: string) => {
    setSelectedWorkerIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workerId)) {
        newSet.delete(workerId);
      } else {
        newSet.add(workerId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    const { error: deleteError } = await supabase
      .from('demand_workers')
      .delete()
      .eq('demand_id', demand.id);

    if (deleteError) {
      showError("Erro ao atualizar atribuições.");
      return;
    }

    if (selectedWorkerIds.size > 0) {
      const newAssignments = Array.from(selectedWorkerIds).map(worker_id => ({
        demand_id: demand.id,
        worker_id,
      }));
      const { error: insertError } = await supabase.from('demand_workers').insert(newAssignments);
      if (insertError) {
        showError("Erro ao salvar novas atribuições.");
        return;
      }
    }
    
    showSuccess("Trabalhadores atribuídos com sucesso!");
    onSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir Trabalhadores</DialogTitle>
          <DialogDescription>Selecione os trabalhadores para a demanda "{demand.title}".</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4 max-h-60 overflow-y-auto">
          {workers.map(worker => (
            <div key={worker.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent">
              <Checkbox
                id={`worker-${worker.id}`}
                checked={selectedWorkerIds.has(worker.id)}
                onCheckedChange={() => handleToggleWorker(worker.id)}
              />
              <Label htmlFor={`worker-${worker.id}`} className="flex-1 cursor-pointer">{worker.full_name}</Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const LocationDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useSession();
  const queryClient = useQueryClient();

  const { data: location, isLoading, error } = useLocationDetails(id);
  const { data: workers = [] } = useWorkers();

  const [isDemandDialogOpen, setIsDemandDialogOpen] = useState(false);
  const [newDemandTitle, setNewDemandTitle] = useState("");
  const [newDemandDate, setNewDemandDate] = useState<Date | undefined>();
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);

  const handleCreateDemand = async () => {
    if (!newDemandTitle.trim() || !id || !location) {
      showError("O título da demanda é obrigatório.");
      return;
    }
    if (!newDemandDate) {
      showError("A data de início da demanda é obrigatória.");
      return;
    }

    const { error } = await supabase
      .from("demands")
      .insert({ 
        title: newDemandTitle, 
        user_id: location.user_id, 
        location_id: id,
        start_date: newDemandDate.toISOString().split('T')[0]
      });

    if (error) {
      showError("Falha ao criar demanda.");
    } else {
      showSuccess("Demanda criada com sucesso!");
      setNewDemandTitle("");
      setNewDemandDate(undefined);
      setIsDemandDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['locationDetails', id] });
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
      queryClient.invalidateQueries({ queryKey: ['locationDetails', id] });
    }
  };

  const handleOpenAssignDialog = (demand: Demand) => {
    setSelectedDemand(demand);
    setIsAssignDialogOpen(true);
  };

  if (isLoading) return <div className="p-4 text-center">Carregando...</div>;
  if (error) return <div className="p-4 text-center text-destructive">Erro: {error.message}</div>;
  if (!location) return <div className="p-4 text-center">Local não encontrado.</div>;

  const demands = location.demands || [];
  const totalLocationSeconds = demands.reduce((total, demand) => {
    return total + calculateTotalDuration(demand.tasks);
  }, 0);
  const formattedTotalLocationTime = formatTotalTime(totalLocationSeconds);

  return (
    <div className="space-y-6">
      <Link to="/locations" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Voltar para Todos os Locais
      </Link>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex-grow">
              <CardTitle className="text-xl sm:text-2xl">{location.client_name}</CardTitle>
              <CardDescription className="flex items-center gap-2 pt-1">
                <MapPin className="h-4 w-4" /> {formatAddress(location)}
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={generateMapsUrl(location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "icon" }), "ml-4 flex-shrink-0")}
                  >
                    <Map className="h-5 w-5" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Abrir no Google Maps</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Demandas</CardTitle>
            {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
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
                      Dê um nome e uma data de início para a nova demanda.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="demand-title">Título da Demanda</Label>
                      <Input
                        id="demand-title"
                        value={newDemandTitle}
                        onChange={(e) => setNewDemandTitle(e.target.value)}
                        placeholder="Ex: Instalação do cliente XPTO"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demand-date">Data de Início</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !newDemandDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newDemandDate ? format(newDemandDate, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newDemandDate}
                            onSelect={setNewDemandDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateDemand}>Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {demands.length > 0 ? (
            <div className="grid gap-4">
              {demands.map((demand) => {
                const totalSeconds = calculateTotalDuration(demand.tasks);
                const formattedTime = formatTotalTime(totalSeconds);
                return (
                  <Card key={demand.id} className="flex flex-col">
                    <CardHeader className="pb-4">
                      <Link to={`/demands/${demand.id}`}>
                        <CardTitle className="hover:underline">{demand.title}</CardTitle>
                      </Link>
                      <CardDescription>
                        Início em: {demand.start_date ? format(new Date(demand.start_date + 'T00:00:00'), "dd/MM/yyyy") : new Date(demand.created_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      {totalSeconds > 0 && (
                        <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{formattedTime}</span>
                        </div>
                      )}
                    </CardContent>
                    {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
                      <CardFooter className="flex justify-between gap-2 pt-4 border-t">
                        <Button variant="outline" className="flex-grow" onClick={() => handleOpenAssignDialog(demand)}>
                          <Users className="mr-2 h-4 w-4" /> Atribuir
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className="flex-shrink-0">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação irá deletar permanentemente a demanda "{demand.title}" e todos os seus dados.
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
                      </CardFooter>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma demanda cadastrada para este local.
            </p>
          )}
        </CardContent>
        {demands.length > 0 && totalLocationSeconds > 0 && (
          <CardFooter className="pt-4 border-t flex justify-end">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Tempo Total no Local:</span>
              <span className="font-bold text-base">{formattedTotalLocationTime}</span>
            </div>
          </CardFooter>
        )}
      </Card>
      {selectedDemand && (
        <AssignWorkerDialog
          demand={selectedDemand}
          workers={workers}
          open={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          onSave={() => queryClient.invalidateQueries({ queryKey: ['locationDetails', id] })}
        />
      )}
    </div>
  );
};

export default LocationDetails;
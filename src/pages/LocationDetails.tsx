import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Location, Demand } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PlusCircle, ArrowLeft, Trash2, MapPin, Map, Clock, CalendarIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatAddress, generateMapsUrl } from "@/utils/address";
import { calculateTotalDuration, formatTotalTime } from "@/utils/time";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSession } from "@/contexts/SessionContext";

const LocationDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useSession();
  const [location, setLocation] = useState<Location | null>(null);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemandDialogOpen, setIsDemandDialogOpen] = useState(false);
  const [newDemandTitle, setNewDemandTitle] = useState("");
  const [newDemandDate, setNewDemandDate] = useState<Date | undefined>();

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("locations")
      .select("*, demands(*, tasks(*))")
      .eq("id", id)
      .order('start_date', { foreignTable: 'demands', ascending: false })
      .single();

    if (error || !data) {
      showError("Local não encontrado.");
      setLocation(null);
    } else {
      setLocation(data);
      setDemands(data.demands || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

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
        start_date: newDemandDate.toISOString().split('T')[0] // Formato YYYY-MM-DD
      });

    if (error) {
      showError("Falha ao criar demanda.");
    } else {
      showSuccess("Demanda criada com sucesso!");
      setNewDemandTitle("");
      setNewDemandDate(undefined);
      setIsDemandDialogOpen(false);
      fetchData();
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
      fetchData();
    }
  };

  if (loading) return <div className="p-4 text-center">Carregando...</div>;
  if (!location) return <div className="p-4 text-center">Local não encontrado.</div>;

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
              <CardTitle className="text-2xl">{location.client_name}</CardTitle>
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
            <ul className="space-y-2">
              {demands.map((demand) => {
                const totalSeconds = calculateTotalDuration(demand.tasks);
                const formattedTime = formatTotalTime(totalSeconds);
                return (
                  <li key={demand.id} className="border p-3 rounded-md flex justify-between items-center hover:bg-accent">
                    <Link to={`/demands/${demand.id}`} className="flex-grow mr-4 flex items-center gap-3">
                      <p className="font-medium">{demand.title}</p>
                      {totalSeconds > 0 && (
                        <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
                          <Clock className="h-3 w-3" />
                          {formattedTime}
                        </span>
                      )}
                    </Link>
                    <div className="flex items-center flex-shrink-0">
                      <span className="text-xs text-muted-foreground mr-2">
                        {demand.start_date ? format(new Date(demand.start_date + 'T00:00:00'), "dd/MM/yyyy") : new Date(demand.created_at).toLocaleDateString()}
                      </span>
                      {profile?.role === 'admin' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
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
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
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
    </div>
  );
};

export default LocationDetails;
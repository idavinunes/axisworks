import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Location, Demand } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, ArrowLeft, Trash2, MapPin, Map } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const LocationDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useState<Location | null>(null);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemandDialogOpen, setIsDemandDialogOpen] = useState(false);
  const [newDemandTitle, setNewDemandTitle] = useState("");

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("locations")
      .select("*, demands(*, locations(*))")
      .eq("id", id)
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
    if (!newDemandTitle.trim() || !id || !location) return;
    const { error } = await supabase
      .from("demands")
      .insert({ title: newDemandTitle, user_id: location.user_id, location_id: id });

    if (error) {
      showError("Falha ao criar demanda.");
    } else {
      showSuccess("Demanda criada com sucesso!");
      setNewDemandTitle("");
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

  const formatAddress = (loc: Location) => {
    return `${loc.street_name}, ${loc.street_number}${loc.unit_number ? `, ${loc.unit_number}` : ''} - ${loc.city}, ${loc.state} ${loc.zip_code}`;
  };

  const generateMapsUrl = (loc: Location) => {
    const address = `${loc.street_name}, ${loc.street_number}, ${loc.city}, ${loc.state} ${loc.zip_code}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  };

  if (loading) return <div className="p-4 text-center">Carregando...</div>;
  if (!location) return <div className="p-4 text-center">Local não encontrado.</div>;

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
                    Dê um nome para a nova demanda neste local.
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
                  <Link to={`/demands/${demand.id}`} className="flex-grow mr-4">
                    <p>{demand.title}</p>
                  </Link>
                  <div className="flex items-center flex-shrink-0">
                    <span className="text-xs text-muted-foreground mr-2">
                      {new Date(demand.created_at).toLocaleDateString()}
                    </span>
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
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma demanda cadastrada para este local.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationDetails;
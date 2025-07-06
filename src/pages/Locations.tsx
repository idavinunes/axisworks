import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Location } from "@/types";
import { PlusCircle, MapPin, Trash2, ArrowLeft } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";

const Locations = () => {
  const { user } = useSession();
  const [locations, setLocations] = useState<Location[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newLocation, setNewLocation] = useState({
    client_name: "",
    street_name: "",
    street_number: "",
    unit_number: "",
    city: "",
    state: "",
    zip_code: "",
  });

  const fetchLocations = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      showError("Erro ao buscar locais.");
    } else {
      setLocations(data || []);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLocations();
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewLocation(prev => ({ ...prev, [id]: value }));
  };

  const handleAddLocation = async () => {
    if (!user || !newLocation.client_name.trim() || !newLocation.street_name.trim()) {
      showError("Preencha pelo menos o nome do cliente e da rua.");
      return;
    }
    const { error } = await supabase
      .from("locations")
      .insert({ ...newLocation, user_id: user.id });

    if (error) {
      showError("Erro ao adicionar local.");
    } else {
      showSuccess("Local adicionado com sucesso!");
      setNewLocation({ client_name: "", street_name: "", street_number: "", unit_number: "", city: "", state: "", zip_code: "" });
      setIsDialogOpen(false);
      fetchLocations();
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    const { error } = await supabase.from("locations").delete().eq("id", locationId);
    if (error) {
      showError("Erro ao deletar local. Verifique se ele não está sendo usado em alguma demanda.");
    } else {
      showSuccess("Local deletado com sucesso.");
      fetchLocations();
    }
  };

  const formatAddress = (loc: Location) => {
    return `${loc.street_name}, ${loc.street_number}${loc.unit_number ? `, ${loc.unit_number}` : ''} - ${loc.city}, ${loc.state} ${loc.zip_code}`;
  };

  return (
    <div className="space-y-6">
      <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Voltar para o Início
      </Link>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Locais de Trabalho</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Local
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Local</DialogTitle>
              <DialogDescription>Preencha os dados do cliente e endereço.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="client_name">Nome do Cliente</Label>
                  <Input id="client_name" value={newLocation.client_name} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street_name">Nome da Rua/Avenida</Label>
                  <Input id="street_name" value={newLocation.street_name} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street_number">Número</Label>
                  <Input id="street_number" value={newLocation.street_number} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_number">Apto/Unidade (Opcional)</Label>
                  <Input id="unit_number" value={newLocation.unit_number} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" value={newLocation.city} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado (Sigla)</Label>
                  <Input id="state" value={newLocation.state} onChange={handleInputChange} maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">CEP (ZIP Code)</Label>
                  <Input id="zip_code" value={newLocation.zip_code} onChange={handleInputChange} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddLocation}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {locations.length > 0 ? (
          locations.map((location) => (
            <Link to={`/locations/${location.id}`} key={location.id}>
              <Card className="h-full hover:bg-accent">
                <CardHeader className="flex flex-row items-start justify-between">
                  <CardTitle>{location.client_name}</CardTitle>
                  <AlertDialog onOpenChange={(e) => e.stopPropagation()} >
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive -mt-2 -mr-2" onClick={(e) => e.preventDefault()}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.preventDefault()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita e irá deletar o local e todas as suas demandas associadas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteLocation(location.id)} className="bg-destructive hover:bg-destructive/90">
                          Deletar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                    <p>{formatAddress(location)}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <p className="col-span-full text-center text-muted-foreground py-8">Nenhum local cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
};

export default Locations;
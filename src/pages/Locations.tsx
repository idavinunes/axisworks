import { useState, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Location } from "@/types";
import { PlusCircle, MapPin, Trash2, ArrowLeft, Pencil, Map } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const Locations = () => {
  const { user } = useSession();
  const [locations, setLocations] = useState<Location[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
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
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const resetForm = () => {
    setFormData({ id: "", client_name: "", street_name: "", street_number: "", unit_number: "", city: "", state: "", zip_code: "" });
  };

  const handleOpenAddDialog = () => {
    setIsEditing(false);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (location: Location) => {
    setIsEditing(true);
    setFormData({
      id: location.id,
      client_name: location.client_name,
      street_name: location.street_name || "",
      street_number: location.street_number || "",
      unit_number: location.unit_number || "",
      city: location.city || "",
      state: location.state || "",
      zip_code: location.zip_code || "",
    });
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!user || !formData.client_name.trim() || !formData.street_name.trim()) {
      showError("Preencha pelo menos o nome do cliente e da rua.");
      return;
    }

    if (isEditing) {
      const { id, ...updateData } = formData;
      const { error } = await supabase.from("locations").update(updateData).eq("id", id);
      if (error) {
        showError("Erro ao atualizar local.");
      } else {
        showSuccess("Local atualizado com sucesso!");
        setIsDialogOpen(false);
        fetchLocations();
      }
    } else {
      const { id, ...insertData } = formData;
      const { error } = await supabase.from("locations").insert({ ...insertData, user_id: user.id });
      if (error) {
        showError("Erro ao adicionar local.");
      } else {
        showSuccess("Local adicionado com sucesso!");
        setIsDialogOpen(false);
        fetchLocations();
      }
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

  const generateMapsUrl = (loc: Location) => {
    const address = `${loc.street_name}, ${loc.street_number}, ${loc.city}, ${loc.state} ${loc.zip_code}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
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
            <Button onClick={handleOpenAddDialog}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Local
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Local" : "Adicionar Novo Local"}</DialogTitle>
              <DialogDescription>{isEditing ? "Atualize os dados do cliente e endereço." : "Preencha os dados do cliente e endereço."}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="client_name">Nome do Cliente</Label>
                  <Input id="client_name" value={formData.client_name} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street_name">Nome da Rua/Avenida</Label>
                  <Input id="street_name" value={formData.street_name} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street_number">Número</Label>
                  <Input id="street_number" value={formData.street_number} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_number">Apto/Unidade (Opcional)</Label>
                  <Input id="unit_number" value={formData.unit_number} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" value={formData.city} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado (Sigla)</Label>
                  <Input id="state" value={formData.state} onChange={handleInputChange} maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">CEP (ZIP Code)</Label>
                  <Input id="zip_code" value={formData.zip_code} onChange={handleInputChange} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleFormSubmit}>Salvar</Button>
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
                  <div className="flex items-center -mt-2 -mr-2">
                    <Button variant="ghost" size="icon" className="hover:bg-accent hover:text-primary" onClick={(e) => { e.preventDefault(); handleOpenEditDialog(location); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog onOpenChange={(e) => e.stopPropagation()} >
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={(e) => e.preventDefault()}>
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
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start justify-between gap-2 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                      <p>{formatAddress(location)}</p>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={generateMapsUrl(location)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 flex-shrink-0")}
                          >
                            <Map className="h-4 w-4" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Abrir no Google Maps</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  const [newClientName, setNewClientName] = useState("");
  const [newAddress, setNewAddress] = useState("");

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

  const handleAddLocation = async () => {
    if (newClientName.trim() && newAddress.trim() && user) {
      const { error } = await supabase
        .from("locations")
        .insert({
          client_name: newClientName.trim(),
          address: newAddress.trim(),
          user_id: user.id,
        });

      if (error) {
        showError("Erro ao adicionar local.");
      } else {
        showSuccess("Local adicionado com sucesso!");
        setNewClientName("");
        setNewAddress("");
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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Local</DialogTitle>
              <DialogDescription>
                Preencha os dados do cliente e endereço.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="client-name" className="text-right">
                  Cliente
                </Label>
                <Input
                  id="client-name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="col-span-3"
                  placeholder="Nome do Cliente"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Endereço
                </Label>
                <Input
                  id="address"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="col-span-3"
                  placeholder="Endereço completo"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddLocation}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {locations.length > 0 ? (
          locations.map((location) => (
            <Card key={location.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <CardTitle>{location.client_name}</CardTitle>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive -mt-2 -mr-2">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Se este local estiver associado a demandas, o vínculo será removido, mas a demanda não será apagada.
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
                  <p>{location.address}</p>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="col-span-full text-center text-muted-foreground py-8">Nenhum local cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
};

export default Locations;
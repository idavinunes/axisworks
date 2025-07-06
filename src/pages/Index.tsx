import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, MapPin } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";

const Index = () => {
  const { profile } = useSession();

  return (
    <div className="space-y-6">
       <h1 className="text-3xl font-bold">Painel de Controle</h1>
       <p className="text-muted-foreground">Bem-vindo! Use os cartões abaixo para navegar pelo sistema.</p>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">
              Locais de Trabalho
            </CardTitle>
            <MapPin className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription>
              Cadastre clientes, gerencie endereços e crie demandas de serviço para cada local.
            </CardDescription>
            <Button asChild className="mt-4">
              <Link to="/locations">Gerenciar Locais</Link>
            </Button>
          </CardContent>
        </Card>

        {profile?.role === "admin" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">
                Gerenciamento de Equipe
              </CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
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
    </div>
  );
};

export default Index;
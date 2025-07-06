import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, Briefcase, CheckSquare, AlertTriangle } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/dashboard/StatCard";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  current: {
    totalDemands: number;
    completedTasks: number;
    delayedDemands: number;
    totalUsers: number;
  };
  changes: {
    totalDemands: number;
    completedTasks: number;
    delayedDemands: number;
  };
}

const Index = () => {
  const { profile } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.functions.invoke("get-dashboard-stats");
      
      if (error) {
        setError("Falha ao carregar as estatísticas do dashboard.");
        console.error(error);
      } else {
        setStats(data);
      }
      setLoading(false);
    };

    fetchStats();
  }, []);

  const renderSkeletons = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-2/4" />
            <Skeleton className="h-6 w-6 rounded-sm" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/4 mb-2" />
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Painel de Controle</h1>
      
      {loading ? renderSkeletons() : error ? (
        <p className="text-red-500">{error}</p>
      ) : stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total de Usuários"
            value={stats.current.totalUsers}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            changeDescription=""
          />
          <StatCard 
            title="Demandas no Mês"
            value={stats.current.totalDemands}
            icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
            change={stats.changes.totalDemands}
          />
          <StatCard 
            title="Tarefas Concluídas no Mês"
            value={stats.current.completedTasks}
            icon={<CheckSquare className="h-4 w-4 text-muted-foreground" />}
            change={stats.changes.completedTasks}
          />
          <StatCard 
            title="Demandas Atrasadas"
            value={stats.current.delayedDemands}
            icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
            change={stats.changes.delayedDemands}
          />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 pt-6">
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
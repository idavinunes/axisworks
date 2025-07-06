import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, Briefcase, CheckSquare, AlertTriangle, BarChart3, Clock, DollarSign } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import StatCard from "@/components/dashboard/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/hooks/useDashboardStats";

interface AdminDashboardStats {
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

interface UserDashboardStats {
  assignedDemands: number;
  completedTasksMonth: number;
  totalHoursMonth: number;
  totalCostMonth: number;
  totalCostWeek: number;
}

const Index = () => {
  const { profile } = useSession();
  const { data: stats, isLoading, error } = useDashboardStats(profile);

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

  const renderAdminDashboard = () => {
    const adminStats = stats as AdminDashboardStats;
    return (
      <>
        {adminStats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              title="Total de Usuários"
              value={adminStats.current.totalUsers}
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              changeDescription=""
            />
            <StatCard 
              title="Demandas no Mês"
              value={adminStats.current.totalDemands}
              icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
              change={adminStats.changes.totalDemands}
            />
            <StatCard 
              title="Tarefas Concluídas no Mês"
              value={adminStats.current.completedTasks}
              icon={<CheckSquare className="h-4 w-4 text-muted-foreground" />}
              change={adminStats.changes.completedTasks}
            />
            <StatCard 
              title="Demandas Atrasadas"
              value={adminStats.current.delayedDemands}
              icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
              change={adminStats.changes.delayedDemands}
            />
          </div>
        )}
      </>
    );
  };

  const renderUserDashboard = () => {
    const userStats = stats as UserDashboardStats;
    return (
      <>
        {userStats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              title="Valor a Receber (Semana)"
              value={`$ ${userStats.totalCostWeek.toFixed(2)}`}
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard 
              title="Valor a Receber (Mês)"
              value={`$ ${userStats.totalCostMonth.toFixed(2)}`}
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard 
              title="Horas Trabalhadas (Mês)"
              value={`${userStats.totalHoursMonth.toFixed(2).replace('.', ',')}h`}
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard 
              title="Tarefas Concluídas (Mês)"
              value={userStats.completedTasksMonth}
              icon={<CheckSquare className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Painel de Controle</h1>
      
      {isLoading ? renderSkeletons() : error ? (
        <p className="text-red-500">Falha ao carregar estatísticas: {error.message}</p>
      ) : (
        profile?.role === 'admin' || profile?.role === 'supervisor' ? renderAdminDashboard() : renderUserDashboard()
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
              Acesse as demandas de serviço, inicie e finalize tarefas em cada local.
            </CardDescription>
            <Button asChild className="mt-4">
              <Link to="/locations">Acessar Locais</Link>
            </Button>
          </CardContent>
        </Card>

        {(profile?.role === "admin" || profile?.role === "supervisor") && (
          <>
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
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">
                  Relatórios
                </CardTitle>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Visualize o desempenho da sua equipe, incluindo horas trabalhadas e custos.
                </CardDescription>
                <Button asChild className="mt-4">
                  <Link to="/reports/users">Ver Relatório de Horas</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
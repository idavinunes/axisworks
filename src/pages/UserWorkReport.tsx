import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, CalendarIcon, User, Clock, DollarSign, CheckSquare } from "lucide-react";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface UserReportData {
  user_id: string;
  full_name: string;
  total_hours: number;
  total_cost: number;
  task_count: number;
}

const UserWorkReport = () => {
  const [report, setReport] = useState<UserReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  useEffect(() => {
    const fetchReport = async () => {
      if (!date?.from || !date?.to) return;

      setLoading(true);

      // Ajusta a data de início para o começo do dia
      const adjustedStartDate = new Date(date.from);
      adjustedStartDate.setHours(0, 0, 0, 0);

      // Ajusta a data final para o fim do dia
      const adjustedEndDate = new Date(date.to);
      adjustedEndDate.setHours(23, 59, 59, 999);

      const { data, error } = await supabase.functions.invoke("get-user-work-report", {
        body: {
          startDate: adjustedStartDate.toISOString(),
          endDate: adjustedEndDate.toISOString(),
        },
      });

      if (error) {
        showError("Falha ao carregar o relatório.");
        console.error(error);
      } else {
        setReport(data.report || []);
      }
      setLoading(false);
    };

    fetchReport();
  }, [date]);

  return (
    <div className="space-y-6">
      <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Voltar para o Painel
      </Link>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Relatório de Horas</h1>
          <p className="text-muted-foreground">Desempenho da equipe no período selecionado.</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className="w-full sm:w-auto justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y", { locale: ptBR })} -{" "}
                    {format(date.to, "LLL dd, y", { locale: ptBR })}
                  </>
                ) : (
                  format(date.from, "LLL dd, y", { locale: ptBR })
                )
              ) : (
                <span>Escolha um período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : report.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {report.map((userData) => (
            <Card key={userData.user_id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  {userData.full_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /> Horas Trabalhadas</span>
                  <span className="font-semibold">{userData.total_hours.toFixed(2).replace('.', ',')}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground"><CheckSquare className="h-4 w-4" /> Tarefas Concluídas</span>
                  <span className="font-semibold">{userData.task_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground"><DollarSign className="h-4 w-4" /> Custo Total</span>
                  <span className="font-semibold text-green-600">$ {userData.total_cost.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum dado de trabalho encontrado para o período selecionado.</p>
        </div>
      )}
    </div>
  );
};

export default UserWorkReport;
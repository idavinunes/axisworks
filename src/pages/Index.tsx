import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Play, Pause, StopCircle, Clock, PlusCircle, ListChecks } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import PhotoCapture from "@/components/PhotoCapture";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { Demand } from "@/types";

type WorkStatus = "idle" | "working" | "paused";

const Index = () => {
  const { profile, user } = useSession();
  const [status, setStatus] = useState<WorkStatus>("idle");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [pausedTime, setPausedTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [startPhoto, setStartPhoto] = useState<string | null>(null);

  const [demands, setDemands] = useState<Demand[]>([]);
  const [isDemandDialogOpen, setIsDemandDialogOpen] = useState(false);
  const [newDemandTitle, setNewDemandTitle] = useState("");

  useEffect(() => {
    if (status === "working") {
      intervalRef.current = setInterval(() => {
        setElapsedTime(Date.now() - (startTime ?? 0) - pausedTime);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [status, startTime, pausedTime]);

  const fetchDemands = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("demands")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      showError("Erro ao buscar demandas.");
      console.error(error);
    } else {
      setDemands(data);
    }
  };

  useEffect(() => {
    fetchDemands();
  }, [user]);

  const handleCreateDemand = async () => {
    if (!newDemandTitle.trim() || !user) return;
    const { error } = await supabase
      .from("demands")
      .insert({ title: newDemandTitle, user_id: user.id });

    if (error) {
      showError("Falha ao criar demanda.");
      console.error(error);
    } else {
      showSuccess("Demanda criada com sucesso!");
      setNewDemandTitle("");
      setIsDemandDialogOpen(false);
      fetchDemands();
    }
  };

  const handleStart = (photoDataUrl: string) => {
    setStartPhoto(photoDataUrl);
    setStartTime(Date.now());
    setStatus("working");
    setElapsedTime(0);
    setPausedTime(0);
    setIsPhotoDialogOpen(false);
    showSuccess("Jornada iniciada com sucesso!");
    console.log("Foto de início capturada:", photoDataUrl.substring(0, 30) + "...");
  };

  const handlePause = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus("paused");
  };

  const handleResume = () => {
    const now = Date.now();
    const pauseDuration = now - (startTime! + elapsedTime);
    setPausedTime(pausedTime + pauseDuration);
    setStatus("working");
  };

  const handleFinish = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    console.log(`Jornada finalizada com ${formatTime(elapsedTime)}`);
    setStatus("idle");
    setElapsedTime(0);
    setStartTime(null);
    setPausedTime(0);
    setStartPhoto(null);
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">
            Controle de Ponto
          </CardTitle>
          <CardDescription>
            Registre sua jornada de trabalho aqui.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-6xl font-mono bg-muted p-4 rounded-lg">
            <Clock className="h-12 w-12 text-primary" />
            <span>{formatTime(elapsedTime)}</span>
          </div>
          <div className="flex justify-center gap-4">
            {status === "idle" && (
              <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg">
                    <Play className="mr-2 h-5 w-5" /> Iniciar Jornada
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registro de Ponto</DialogTitle>
                  </DialogHeader>
                  <PhotoCapture 
                    onPhotoTaken={handleStart}
                    onCancel={() => setIsPhotoDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
            {status === "working" && (
              <>
                <Button size="lg" variant="outline" onClick={handlePause}>
                  <Pause className="mr-2 h-5 w-5" /> Pausar
                </Button>
                <Button size="lg" variant="destructive" onClick={handleFinish}>
                  <StopCircle className="mr-2 h-5 w-5" /> Finalizar Jornada
                </Button>
              </>
            )}
            {status === "paused" && (
              <>
                <Button size="lg" onClick={handleResume}>
                  <Play className="mr-2 h-5 w-5" /> Retomar
                </Button>
                <Button size="lg" variant="destructive" onClick={handleFinish}>
                  <StopCircle className="mr-2 h-5 w-5" /> Finalizar Jornada
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              <CardTitle>Minhas Demandas</CardTitle>
            </div>
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
                    Dê um nome para sua nova demanda para começar a adicionar tarefas.
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
                <li key={demand.id} className="border p-3 rounded-md hover:bg-accent">
                  <Link to={`/demands/${demand.id}`} className="flex justify-between items-center">
                    <span>{demand.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(demand.created_at).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Você ainda não tem nenhuma demanda.
            </p>
          )}
        </CardContent>
      </Card>

      {profile?.role === "admin" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gerenciamento
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
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
  );
};

export default Index;
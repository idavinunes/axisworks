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
import { Users, Play, Pause, StopCircle, Clock } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";

type WorkStatus = "idle" | "working" | "paused";

const Index = () => {
  const { profile } = useSession();
  const [status, setStatus] = useState<WorkStatus>("idle");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [pausedTime, setPausedTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleStart = () => {
    setStartTime(Date.now());
    setStatus("working");
    setElapsedTime(0);
    setPausedTime(0);
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
    // Aqui salvaremos os dados no futuro
    console.log(`Jornada finalizada com ${formatTime(elapsedTime)}`);
    setStatus("idle");
    setElapsedTime(0);
    setStartTime(null);
    setPausedTime(0);
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
              <Button size="lg" onClick={handleStart}>
                <Play className="mr-2 h-5 w-5" /> Iniciar Jornada
              </Button>
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
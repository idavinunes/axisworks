import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Demand, Task } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import PhotoCapture from "@/components/PhotoCapture";
import { PlusCircle, Timer, Camera, ArrowLeft, Trash2 } from "lucide-react";

const TaskItem = ({ task, onUpdate }: { task: Task, onUpdate: () => void }) => {
  const [isTiming, setIsTiming] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(task.duration_seconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);

  useEffect(() => {
    if (isTiming) {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const newElapsedTime = task.duration_seconds + Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedTime(newElapsedTime);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isTiming, task.duration_seconds]);

  const handleToggleTiming = async () => {
    if (isTiming) {
      // Stopping timer
      const duration = task.duration_seconds + Math.floor((Date.now() - startTimeRef.current) / 1000);
      const { error } = await supabase.from('tasks').update({ duration_seconds: duration }).eq('id', task.id);
      if (error) showError("Erro ao salvar tempo.");
      else onUpdate();
    }
    setIsTiming(!isTiming);
  };

  const handleToggleComplete = async () => {
    if (isTiming) {
      showError("Pare o cronômetro antes de completar a tarefa.");
      return;
    }
    const { error } = await supabase.from('tasks').update({ is_completed: !task.is_completed }).eq('id', task.id);
    if (error) showError("Erro ao atualizar tarefa.");
    else onUpdate();
  };

  const handlePhotoTaken = async (photoDataUrl: string) => {
    const response = await fetch(photoDataUrl);
    const blob = await response.blob();
    const fileName = `${task.id}/${Date.now()}.jpg`;
    
    const { data, error: uploadError } = await supabase.storage.from('task-photos').upload(fileName, blob);

    if (uploadError) {
      showError("Falha ao enviar foto.");
      console.error(uploadError);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('task-photos').getPublicUrl(data.path);
    
    const { error: updateError } = await supabase.from('tasks').update({ photo_url: publicUrl }).eq('id', task.id);
    
    if (updateError) {
      showError("Erro ao salvar URL da foto.");
    } else {
      showSuccess("Foto salva com sucesso!");
      onUpdate();
    }
    setIsPhotoDialogOpen(false);
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-4 p-3 border rounded-md">
      <Checkbox id={`task-${task.id}`} checked={task.is_completed} onCheckedChange={handleToggleComplete} />
      <label htmlFor={`task-${task.id}`} className={`flex-grow ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
        {task.title}
      </label>
      <div className="flex items-center gap-4">
        <span className="text-sm font-mono w-24 text-center">{formatTime(elapsedTime)}</span>
        <Button variant={isTiming ? "destructive" : "outline"} size="sm" onClick={handleToggleTiming} disabled={task.is_completed}>
          <Timer className="mr-2 h-4 w-4" /> {isTiming ? "Parar" : "Iniciar"}
        </Button>
        <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={task.is_completed}>
              <Camera className="mr-2 h-4 w-4" /> {task.photo_url ? "Ver/Trocar Foto" : "Tirar Foto"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Foto da Tarefa: {task.title}</DialogTitle>
            </DialogHeader>
            {task.photo_url && <img src={task.photo_url} alt="Foto da tarefa" className="my-4 rounded-lg" />}
            <PhotoCapture onPhotoTaken={handlePhotoTaken} onCancel={() => setIsPhotoDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

const DemandDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [demand, setDemand] = useState<Demand | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!id) return;
    const { data: demandData, error: demandError } = await supabase
      .from("demands")
      .select("*")
      .eq("id", id)
      .single();

    if (demandError) {
      showError("Demanda não encontrada.");
      setLoading(false);
      return;
    }
    setDemand(demandData);

    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("demand_id", id)
      .order("created_at", { ascending: true });

    if (tasksError) {
      showError("Erro ao buscar tarefas.");
    } else {
      setTasks(tasksData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !id) return;
    const { error } = await supabase
      .from("tasks")
      .insert({ demand_id: id, title: newTaskTitle });

    if (error) {
      showError("Erro ao adicionar tarefa.");
    } else {
      setNewTaskTitle("");
      fetchData();
    }
  };
  
  const totalDuration = tasks.reduce((acc, task) => acc + task.duration_seconds, 0);
  const formatTotalTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) return <div>Carregando...</div>;
  if (!demand) return <div>Demanda não encontrada.</div>;

  return (
    <div className="space-y-6">
      <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Voltar para Todas as Demandas
      </Link>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{demand.title}</CardTitle>
              <CardDescription>
                Acompanhe o progresso das tarefas abaixo.
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">{formatTotalTime(totalDuration)}</p>
              <p className="text-sm text-muted-foreground">Tempo Total</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} onUpdate={fetchData} />
            ))}
          </div>
          <div className="flex gap-2 pt-4">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Digite o nome da nova tarefa"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            />
            <Button onClick={handleAddTask}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Tarefa
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemandDetails;
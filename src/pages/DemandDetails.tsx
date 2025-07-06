import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Demand, Task, Location } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import PhotoCapture from "@/components/PhotoCapture";
import { PlusCircle, Timer, Camera, ArrowLeft, Trash2, MapPin, Map } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const TaskItem = ({ task, onUpdate }: { task: Task, onUpdate: () => void }) => {
  const [isTiming, setIsTiming] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(task.duration_seconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [isTakingNewPhoto, setIsTakingNewPhoto] = useState(false);

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
    if (!task.is_completed && !task.photo_url) {
      showError("É necessário adicionar uma foto antes de concluir a tarefa.");
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
    
    const { error: updateError } = await supabase.from('tasks').update({ photo_url: data.path }).eq('id', task.id);
    
    if (updateError) {
      showError("Erro ao salvar caminho da foto.");
    } else {
      showSuccess("Foto salva com sucesso!");
      onUpdate();
    }
  };

  const handleDeleteTask = async () => {
    if (task.photo_url) {
        const pathParts = task.photo_url.split('/');
        const folder = pathParts.slice(0, -1).join('/');
        const { data: listData, error: listError } = await supabase.storage
            .from('task-photos')
            .list(folder, { limit: 100 });

        if (listError) {
            showError("Erro ao listar fotos para deletar.");
        } else if (listData && listData.length > 0) {
            const filesToRemove = listData.map((file) => `${folder}/${file.name}`);
            await supabase.storage.from('task-photos').remove(filesToRemove);
        }
    }

    const { error: dbError } = await supabase.from('tasks').delete().eq('id', task.id);
    if (dbError) {
      showError("Erro ao deletar tarefa.");
    } else {
      showSuccess("Tarefa deletada com sucesso.");
      onUpdate();
    }
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2 p-3 border rounded-md">
      <Checkbox id={`task-${task.id}`} checked={task.is_completed} onCheckedChange={handleToggleComplete} />
      <label htmlFor={`task-${task.id}`} className={`flex-grow ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
        {task.title}
      </label>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono w-24 text-center">{formatTime(elapsedTime)}</span>
        <Button variant={isTiming ? "destructive" : "outline"} size="sm" onClick={handleToggleTiming} disabled={task.is_completed}>
          <Timer className="mr-2 h-4 w-4" /> {isTiming ? "Parar" : "Iniciar"}
        </Button>
        <Dialog open={isPhotoDialogOpen} onOpenChange={(open) => {
          setIsPhotoDialogOpen(open);
          if (!open) {
            setIsTakingNewPhoto(false);
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={task.is_completed}>
              <Camera className="mr-2 h-4 w-4" /> {task.photo_url ? "Ver/Trocar" : "Foto"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Foto da Tarefa: {task.title}</DialogTitle>
            </DialogHeader>
            {isTakingNewPhoto ? (
              <PhotoCapture 
                onPhotoTaken={async (dataUrl) => {
                  await handlePhotoTaken(dataUrl);
                  setIsTakingNewPhoto(false);
                }} 
                onCancel={() => setIsTakingNewPhoto(false)} 
              />
            ) : (
              <div className="flex flex-col items-center gap-4 pt-4">
                {task.signed_photo_url ? (
                  <img src={task.signed_photo_url} alt="Foto da tarefa" className="rounded-lg max-h-80 w-auto mx-auto" />
                ) : (
                  <div className="my-4 p-8 text-center text-muted-foreground bg-muted rounded-lg w-full">
                    <Camera className="mx-auto h-12 w-12 mb-2" />
                    Nenhuma foto foi tirada para esta tarefa ainda.
                  </div>
                )}
                <div className="flex w-full justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsPhotoDialogOpen(false)}>Fechar</Button>
                  <Button onClick={() => setIsTakingNewPhoto(true)}>
                    <Camera className="mr-2 h-4 w-4" /> 
                    {task.signed_photo_url ? "Tirar Nova Foto" : "Tirar Foto"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso irá deletar permanentemente a tarefa e suas fotos associadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive hover:bg-destructive/90">
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
    setLoading(true);
    const { data: demandData, error: demandError } = await supabase
      .from("demands")
      .select("*, locations(*)")
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
      setTasks([]);
    } else if (tasksData) {
      const tasksWithSignedUrls = await Promise.all(
        tasksData.map(async (task) => {
          if (task.photo_url) {
            const { data, error } = await supabase.storage
              .from('task-photos')
              .createSignedUrl(task.photo_url, 3600); // Link válido por 1 hora
            if (error) {
              console.error("Error creating signed url for", task.photo_url, error);
              return { ...task, signed_photo_url: undefined };
            }
            return { ...task, signed_photo_url: data.signedUrl };
          }
          return task;
        })
      );
      setTasks(tasksWithSignedUrls);
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

  const formatAddress = (loc: any) => {
    if (!loc) return "";
    return `${loc.street_name}, ${loc.street_number}${loc.unit_number ? `, ${loc.unit_number}` : ''} - ${loc.city}, ${loc.state} ${loc.zip_code}`;
  };

  const generateMapsUrl = (loc: Location) => {
    const address = `${loc.street_name}, ${loc.street_number}, ${loc.city}, ${loc.state} ${loc.zip_code}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  };

  if (loading) return <div className="p-4 text-center">Carregando...</div>;
  if (!demand) return <div className="p-4 text-center">Demanda não encontrada.</div>;

  return (
    <div className="space-y-6">
      <Link to={`/locations/${demand.location_id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Voltar para {demand.locations?.client_name || 'Local'}
      </Link>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-grow">
              <CardTitle className="text-2xl">{demand.title}</CardTitle>
              {demand.locations && (
                <CardDescription className="flex items-center gap-2 pt-2 text-base">
                  <div className="flex items-start gap-2 flex-grow">
                    <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{demand.locations.client_name}</p>
                      <p className="text-muted-foreground">{formatAddress(demand.locations)}</p>
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={generateMapsUrl(demand.locations)}
                          target="_blank"
                          rel="noopener noreferrer"
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
                </CardDescription>
              )}
            </div>
            <div className="text-right flex-shrink-0">
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
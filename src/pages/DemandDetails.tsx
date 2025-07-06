import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Demand, Task } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import PhotoCapture from "@/components/PhotoCapture";
import { PlusCircle, Camera, ArrowLeft, Trash2, MapPin, Map, CheckCircle2, Clock, Image as ImageIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatAddress, generateMapsUrl } from "@/utils/address";
import { calculateTotalDuration, formatTotalTime } from "@/utils/time";

const TaskItem = ({ task, onUpdate }: { task: Task, onUpdate: () => void }) => {
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [photoAction, setPhotoAction] = useState<'start' | 'end' | null>(null);
  const [isViewingPhotos, setIsViewingPhotos] = useState(false);

  const handlePhotoTaken = async (photoDataUrl: string) => {
    if (!photoAction) return;

    const response = await fetch(photoDataUrl);
    const blob = await response.blob();
    const fileName = `${task.id}/${photoAction}_${Date.now()}.jpg`;
    
    const { data, error: uploadError } = await supabase.storage.from('task-photos').upload(fileName, blob);

    if (uploadError) {
      showError("Falha ao enviar foto.");
      console.error(uploadError);
      setIsPhotoDialogOpen(false);
      return;
    }
    
    let updatePayload = {};
    if (photoAction === 'start') {
      updatePayload = {
        start_photo_url: data.path,
        started_at: new Date().toISOString(),
      };
    } else { // 'end'
      updatePayload = {
        end_photo_url: data.path,
        completed_at: new Date().toISOString(),
        is_completed: true,
      };
    }

    const { error: updateError } = await supabase.from('tasks').update(updatePayload).eq('id', task.id);
    
    if (updateError) {
      showError("Erro ao salvar dados da tarefa.");
    } else {
      showSuccess(`Foto de ${photoAction === 'start' ? 'início' : 'fim'} salva com sucesso!`);
      onUpdate();
    }
    setIsPhotoDialogOpen(false);
  };

  const handleDeleteTask = async () => {
    if (task.start_photo_url || task.end_photo_url) {
        const { data: listData, error: listError } = await supabase.storage
            .from('task-photos')
            .list(task.id, { limit: 100 });

        if (listError) {
            showError("Erro ao listar fotos para deletar.");
        } else if (listData && listData.length > 0) {
            const filesToRemove = listData.map((file) => `${task.id}/${file.name}`);
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

  const calculateDuration = () => {
    if (!task.started_at || !task.completed_at) return { formatted: "Em andamento", seconds: 0 };
    const start = new Date(task.started_at).getTime();
    const end = new Date(task.completed_at).getTime();
    const diffSeconds = Math.floor((end - start) / 1000);
    
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;
    return {
        formatted: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
        seconds: diffSeconds
    };
  };

  const { formatted: formattedDuration, seconds: actualDurationSeconds } = calculateDuration();

  const renderStatus = () => {
    if (task.is_completed) {
      let statusColor = "text-green-600";
      let comparisonElement = null;

      if (task.presumed_hours !== null && task.presumed_hours !== undefined) {
        const presumedSeconds = task.presumed_hours * 3600;
        const differenceSeconds = actualDurationSeconds - presumedSeconds;
        const toleranceSeconds = presumedSeconds * 0.15; // 15% tolerance

        let message = "";
        let messageColor = "";

        if (differenceSeconds > toleranceSeconds) { // Took more than 15% longer (bad)
          statusColor = "text-red-600";
          messageColor = "text-red-600 font-semibold";
          message = `(+${formatTotalTime(differenceSeconds)})`;
        } else if (differenceSeconds < 0) { // Finished earlier (good)
          messageColor = "text-green-600 font-semibold";
          message = `(-${formatTotalTime(Math.abs(differenceSeconds))})`;
        }
        
        comparisonElement = (
          <div className="text-xs mt-1">
              <span>Prev: {task.presumed_hours.toFixed(2).replace('.',',')}h</span>
              {message && <span className={`ml-1 ${messageColor}`}>{message}</span>}
          </div>
        );
      }

      return (
        <div className={`flex flex-col items-center ${statusColor}`}>
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-xs font-semibold">Concluída</span>
          <span className="text-xs font-mono">{formattedDuration}</span>
          {comparisonElement}
        </div>
      );
    }
    if (task.started_at) {
      return (
        <div className="flex flex-col items-center text-blue-600">
          <Clock className="h-5 w-5" />
          <span className="text-xs font-semibold">Em Andamento</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center text-muted-foreground">
        <Clock className="h-5 w-5" />
        <span className="text-xs font-semibold">Pendente</span>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-4 p-3 border rounded-md">
      <div className="w-24 text-center">{renderStatus()}</div>
      <span className="flex-grow font-medium">{task.title}</span>
      <div className="flex items-center gap-2">
        {!task.started_at && (
          <Button size="sm" onClick={() => { setPhotoAction('start'); setIsPhotoDialogOpen(true); }}>
            <Camera className="mr-2 h-4 w-4" /> Iniciar
          </Button>
        )}
        {task.started_at && !task.completed_at && (
          <Button size="sm" variant="destructive" onClick={() => { setPhotoAction('end'); setIsPhotoDialogOpen(true); }}>
            <Camera className="mr-2 h-4 w-4" /> Finalizar
          </Button>
        )}
        {(task.start_photo_url || task.end_photo_url) && (
          <Dialog open={isViewingPhotos} onOpenChange={setIsViewingPhotos}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon"><ImageIcon className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Fotos da Tarefa: {task.title}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div>
                  <h3 className="font-semibold mb-2">Início</h3>
                  {task.signed_start_photo_url ? <img src={task.signed_start_photo_url} alt="Foto de início" className="rounded-lg" /> : <p className="text-sm text-muted-foreground">Sem foto.</p>}
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Fim</h3>
                  {task.signed_end_photo_url ? <img src={task.signed_end_photo_url} alt="Foto de fim" className="rounded-lg" /> : <p className="text-sm text-muted-foreground">Sem foto.</p>}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação irá deletar permanentemente a tarefa e suas fotos.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive hover:bg-destructive/90">Deletar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tirar Foto de {photoAction === 'start' ? 'Início' : 'Fim'}</DialogTitle>
            <DialogDescription>Tarefa: {task.title}</DialogDescription>
          </DialogHeader>
          <PhotoCapture onPhotoTaken={handlePhotoTaken} onCancel={() => setIsPhotoDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DemandDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [demand, setDemand] = useState<Demand | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newPresumedH, setNewPresumedH] = useState("");
  const [newPresumedM, setNewPresumedM] = useState("");
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const forceRefresh = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: demandData, error: demandError } = await supabase.from("demands").select("*, locations(*)").eq("id", id).single();

        if (demandError) throw demandError;
        setDemand(demandData);

        const { data: tasksData, error: tasksError } = await supabase.from("tasks").select("*").eq("demand_id", id).order("created_at", { ascending: true });

        if (tasksError) throw tasksError;

        if (tasksData) {
          const tasksWithSignedUrls = await Promise.all(
            tasksData.map(async (task) => {
              const signedUrls: Partial<Task> = {};
              if (task.start_photo_url) {
                const { data, error } = await supabase.storage.from('task-photos').createSignedUrl(task.start_photo_url, 3600);
                if (error) console.error("Error creating signed URL for start photo:", error.message);
                else signedUrls.signed_start_photo_url = data.signedUrl;
              }
              if (task.end_photo_url) {
                const { data, error } = await supabase.storage.from('task-photos').createSignedUrl(task.end_photo_url, 3600);
                if (error) console.error("Error creating signed URL for end photo:", error.message);
                else signedUrls.signed_end_photo_url = data.signedUrl;
              }
              return { ...task, ...signedUrls };
            })
          );
          setTasks(tasksWithSignedUrls);
        } else {
          setTasks([]);
        }
      } catch (error) {
        console.error("Error fetching demand details:", error);
        showError("Falha ao carregar detalhes da demanda.");
        setDemand(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, refreshKey]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !id) {
      showError("O título da tarefa é obrigatório.");
      return;
    }
    
    const hours = parseInt(newPresumedH, 10) || 0;
    const minutes = parseInt(newPresumedM, 10) || 0;

    if (hours < 0 || minutes < 0 || minutes >= 60) {
        showError("Valores de horas ou minutos inválidos. Os minutos devem ser menores que 60.");
        return;
    }

    const presumedHoursValue = (hours > 0 || minutes > 0) ? (hours + minutes / 60) : null;

    const { error } = await supabase.from("tasks").insert({ 
        demand_id: id, 
        title: newTaskTitle,
        presumed_hours: presumedHoursValue
    });

    if (error) {
      showError("Erro ao adicionar tarefa.");
    } else {
      showSuccess("Tarefa adicionada com sucesso!");
      setNewTaskTitle("");
      setNewPresumedH("");
      setNewPresumedM("");
      setIsAddTaskDialogOpen(false);
      forceRefresh();
    }
  };

  if (loading) return <div className="p-4 text-center">Carregando...</div>;
  if (!demand) return <div className="p-4 text-center">Demanda não encontrada ou erro ao carregar.</div>;

  const totalSeconds = calculateTotalDuration(tasks);

  return (
    <div className="space-y-6">
      {demand.location_id && (
        <Link to={`/locations/${demand.location_id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Voltar para {demand.locations?.client_name || 'Local'}
        </Link>
      )}
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
                        <a href={generateMapsUrl(demand.locations)} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 flex-shrink-0")}>
                          <Map className="h-4 w-4" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent><p>Abrir no Google Maps</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardDescription>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-lg">{formatTotalTime(totalSeconds)}</p>
              <p className="text-sm text-muted-foreground">Tempo Total</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} onUpdate={forceRefresh} />
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Tarefa</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Adicionar Nova Tarefa</DialogTitle>
                  <DialogDescription>
                    Preencha os detalhes da nova tarefa.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-title">Título da Tarefa</Label>
                    <Input id="task-title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Ex: Limpar a área externa" />
                  </div>
                  <div className="space-y-2">
                    <Label>Horas Presumidas (Opcional)</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label htmlFor="presumed-h" className="text-xs text-muted-foreground">Horas</Label>
                            <Input 
                                id="presumed-h" 
                                type="number" 
                                value={newPresumedH} 
                                onChange={(e) => setNewPresumedH(e.target.value)}
                                placeholder="Ex: 1"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="presumed-m" className="text-xs text-muted-foreground">Minutos</Label>
                            <Input 
                                id="presumed-m" 
                                type="number" 
                                value={newPresumedM} 
                                onChange={(e) => setNewPresumedM(e.target.value)}
                                placeholder="Ex: 30"
                            />
                        </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddTask}>Salvar Tarefa</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemandDetails;
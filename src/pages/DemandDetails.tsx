import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Demand, Task, Location } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import PhotoCapture from "@/components/PhotoCapture";
import { PlusCircle, Camera, ArrowLeft, Trash2, MapPin, Map, CheckCircle2, Clock, Image as ImageIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
    if (!task.started_at || !task.completed_at) return "Em andamento";
    const start = new Date(task.started_at).getTime();
    const end = new Date(task.completed_at).getTime();
    const diffSeconds = Math.floor((end - start) / 1000);
    
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const renderStatus = () => {
    if (task.is_completed) {
      return (
        <div className="flex flex-col items-center text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-xs font-semibold">Concluída</span>
          <span className="text-xs font-mono">{calculateDuration()}</span>
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
      <div className="w-20 text-center">{renderStatus()}</div>
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
  const [loading, setLoading] = useState(true);

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
  }, [id]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !id) return;
    const { error } = await supabase.from("tasks").insert({ demand_id: id, title: newTaskTitle });
    if (error) {
      showError("Erro ao adicionar tarefa.");
    } else {
      setNewTaskTitle("");
      // Re-fetch data after adding a task
      const event = new Event('refetch');
      window.dispatchEvent(event);
    }
  };
  
  useEffect(() => {
    const handleRefetch = () => {
      if (id) {
        // A bit of a hack to re-trigger the main useEffect
        const currentId = id;
        const navigate = (p: string) => window.history.replaceState(null, '', p);
        navigate(`/demands/`);
        setTimeout(() => navigate(`/demands/${currentId}`), 0);
      }
    };
    window.addEventListener('refetch', handleRefetch);
    return () => window.removeEventListener('refetch', handleRefetch);
  }, [id]);


  const totalDuration = tasks.reduce((acc, task) => {
    if (task.started_at && task.completed_at) {
      const start = new Date(task.started_at).getTime();
      const end = new Date(task.completed_at).getTime();
      return acc + Math.floor((end - start) / 1000);
    }
    return acc;
  }, 0);

  const formatTotalTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatAddress = (loc: Location) => {
    return `${loc.street_name}, ${loc.street_number}${loc.unit_number ? `, ${loc.unit_number}` : ''} - ${loc.city}, ${loc.state} ${loc.zip_code}`;
  };

  const generateMapsUrl = (loc: Location) => {
    const address = `${loc.street_name}, ${loc.street_number}, ${loc.city}, ${loc.state} ${loc.zip_code}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  };

  if (loading) return <div className="p-4 text-center">Carregando...</div>;
  if (!demand) return <div className="p-4 text-center">Demanda não encontrada ou erro ao carregar.</div>;

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
              <p className="font-bold text-lg">{formatTotalTime(totalDuration)}</p>
              <p className="text-sm text-muted-foreground">Tempo Total</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} onUpdate={() => {
                  const event = new Event('refetch');
                  window.dispatchEvent(event);
              }} />
            ))}
          </div>
          <div className="flex gap-2 pt-4">
            <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Digite o nome da nova tarefa" onKeyDown={(e) => e.key === 'Enter' && handleAddTask()} />
            <Button onClick={handleAddTask}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Tarefa</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemandDetails;
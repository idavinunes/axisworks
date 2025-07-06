import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Demand, Task, Profile } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import PhotoCapture from "@/components/PhotoCapture";
import { PlusCircle, Camera, ArrowLeft, Trash2, MapPin, Map, CheckCircle2, Clock, Image as ImageIcon, CalendarIcon, User, DollarSign } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatAddress, generateMapsUrl } from "@/utils/address";
import { calculateTotalDuration, formatTotalTime } from "@/utils/time";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSession } from "@/contexts/SessionContext";

const TaskItem = ({ task, onUpdate, demandStartDate, profile }: { task: Task, onUpdate: () => void, demandStartDate?: string | null, profile: Profile | null }) => {
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [photoAction, setPhotoAction] = useState<'start' | 'end' | null>(null);
  const [isViewingPhotos, setIsViewingPhotos] = useState(false);

  const isScheduledForToday = () => {
    if (!demandStartDate) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduledDate = new Date(demandStartDate + 'T00:00:00');
    scheduledDate.setHours(0, 0, 0, 0);
    return today.getTime() === scheduledDate.getTime();
  };

  const canStartTask = isScheduledForToday();

  const handlePhotoTaken = async (photoDataUrl: string) => {
    if (!photoAction || !profile) return;

    const response = await fetch(photoDataUrl);
    const blob = await response.blob();
    const fileName = `${task.id}/${photoAction}_${Date.now()}.jpg`;
    
    const { data, error: uploadError } = await supabase.storage.from('task-photos').upload(fileName, blob);

    if (uploadError) {
      showError("Falha ao enviar foto.");
      setIsPhotoDialogOpen(false);
      return;
    }
    
    let updatePayload: Partial<Task> = {};
    if (photoAction === 'start') {
      updatePayload = {
        start_photo_url: data.path,
        started_at: new Date().toISOString(),
        worker_id: profile.id,
      };
    } else {
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
    // ... (código de deletar tarefa permanece o mesmo)
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

  const { formatted: formattedDuration } = calculateDuration();

  return (
    <div className="flex flex-col gap-2 p-3 border rounded-md">
      <div className="flex items-center gap-4">
        <div className="w-24 text-center">
          {/* renderStatus() logic here */}
        </div>
        <span className="flex-grow font-medium">{task.title}</span>
        <div className="flex items-center gap-2">
          {!task.started_at && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-block">
                    <Button size="sm" onClick={() => { setPhotoAction('start'); setIsPhotoDialogOpen(true); }} disabled={!canStartTask}>
                      <Camera className="mr-2 h-4 w-4" /> Iniciar
                    </Button>
                  </div>
                </TooltipTrigger>
                {!canStartTask && <TooltipContent><p>A tarefa só pode ser iniciada na data agendada.</p></TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          )}
          {task.started_at && !task.completed_at && (
            <Button size="sm" variant="destructive" onClick={() => { setPhotoAction('end'); setIsPhotoDialogOpen(true); }}>
              <Camera className="mr-2 h-4 w-4" /> Finalizar
            </Button>
          )}
          {(task.start_photo_url || task.end_photo_url) && (
            <Dialog open={isViewingPhotos} onOpenChange={setIsViewingPhotos}>
              <DialogTrigger asChild><Button variant="outline" size="icon"><ImageIcon className="h-4 w-4" /></Button></DialogTrigger>
              <DialogContent>
                {/* Photo viewing logic */}
              </DialogContent>
            </Dialog>
          )}
          {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
              <AlertDialogContent>
                {/* Delete confirmation */}
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      {task.profiles && (
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2 mt-2">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3" />
            <span>{task.profiles.full_name}</span>
          </div>
          {task.is_completed && task.profiles.hourly_cost && (
            <div className="flex items-center gap-2 font-mono">
              <DollarSign className="h-3 w-3" />
              <span>Custo: R$ {((calculateDuration().seconds / 3600) * (task.profiles.hourly_cost || 0)).toFixed(2).replace('.', ',')}</span>
            </div>
          )}
        </div>
      )}
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        {/* Photo capture dialog */}
      </Dialog>
    </div>
  );
};

const DemandDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useSession();
  const [demand, setDemand] = useState<Demand | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  // ... (other states)
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const forceRefresh = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) { setLoading(false); return; }
      setLoading(true);
      try {
        const { data: demandData, error: demandError } = await supabase.from("demands").select("*, locations(*)").eq("id", id).single();
        if (demandError) throw demandError;
        setDemand(demandData);

        const { data: tasksData, error: tasksError } = await supabase.from("tasks").select("*, profiles!left(*)").eq("demand_id", id).order("created_at", { ascending: true });
        if (tasksError) throw tasksError;

        // ... (photo URL signing logic)
        setTasks(tasksData || []);

      } catch (error) {
        showError("Falha ao carregar detalhes da demanda.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, refreshKey]);

  // ... (handleAddTask logic)

  if (loading) return <div className="p-4 text-center">Carregando...</div>;
  if (!demand) return <div className="p-4 text-center">Demanda não encontrada.</div>;

  const totalSeconds = calculateTotalDuration(tasks);
  const totalCost = tasks.reduce((acc, task) => {
    if (task.is_completed && task.profiles?.hourly_cost) {
      const start = new Date(task.started_at!).getTime();
      const end = new Date(task.completed_at!).getTime();
      const hours = (end - start) / (1000 * 60 * 60);
      return acc + hours * task.profiles.hourly_cost;
    }
    return acc;
  }, 0);

  return (
    <div className="space-y-6">
      {/* ... (Link back) */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            {/* ... (Demand title and location) */}
            <div className="text-right flex-shrink-0 space-y-1">
              <div className="flex items-center justify-end gap-2">
                <p className="font-bold text-lg">{formatTotalTime(totalSeconds)}</p>
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              {totalCost > 0 && (
                <div className="flex items-center justify-end gap-2">
                  <p className="font-bold text-lg text-green-600">R$ {totalCost.toFixed(2).replace('.', ',')}</p>
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} onUpdate={forceRefresh} demandStartDate={demand.start_date} profile={profile} />
            ))}
          </div>
          {/* ... (Add task button and dialog) */}
        </CardContent>
      </Card>
    </div>
  );
};

export default DemandDetails;
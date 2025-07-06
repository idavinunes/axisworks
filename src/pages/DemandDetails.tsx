import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Demand, Task, Profile, TaskStatus } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import PhotoCapture from "@/components/PhotoCapture";
import { PlusCircle, Camera, ArrowLeft, Trash2, MapPin, Map, CheckCircle2, Clock, Image as ImageIcon, CalendarIcon, User, DollarSign, Pencil, Hourglass, BadgeCheck } from "lucide-react";
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
    const formData = new FormData();
    formData.append('photo', blob, 'photo.jpg');
    formData.append('taskId', task.id);
    formData.append('photoAction', photoAction);

    const { data: functionData, error: functionError } = await supabase.functions.invoke('upload-task-photo', {
      body: formData,
    });

    if (functionError || !functionData.path) {
      showError(functionError?.message || "Falha ao enviar foto.");
      setIsPhotoDialogOpen(false);
      return;
    }
    
    let updatePayload: Partial<Task> = {};
    if (photoAction === 'start') {
      updatePayload = {
        start_photo_url: functionData.path,
        started_at: new Date().toISOString(),
        worker_id: profile.id,
        status: 'in_progress',
      };
    } else {
      updatePayload = {
        end_photo_url: functionData.path,
        completed_at: new Date().toISOString(),
        status: 'pending_approval',
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

  const handleApproveTask = async () => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'approved' })
      .eq('id', task.id);

    if (error) {
      showError("Erro ao aprovar a tarefa.");
    } else {
      showSuccess("Tarefa aprovada com sucesso!");
      onUpdate();
    }
  };

  const handleDeleteTask = async () => {
    const filesToDelete: string[] = [];
    if (task.start_photo_url) filesToDelete.push(task.start_photo_url);
    if (task.end_photo_url) filesToDelete.push(task.end_photo_url);

    if (filesToDelete.length > 0) {
      await supabase.storage.from('task-photos').remove(filesToDelete);
    }

    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) {
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
    return { seconds: diffSeconds };
  };

  const renderStatus = () => {
    switch (task.status) {
      case 'approved':
        return <BadgeCheck className="h-6 w-6 text-green-500" />;
      case 'pending_approval':
        return <Hourglass className="h-6 w-6 text-yellow-500" />;
      case 'in_progress':
        return <Clock className="h-6 w-6 text-blue-500 animate-pulse" />;
      case 'pending':
      default:
        return <CalendarIcon className="h-6 w-6 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 border rounded-md">
      <div className="flex items-center gap-4">
        <div className="w-10 text-center flex justify-center items-center">
          {renderStatus()}
        </div>
        <span className="flex-grow font-medium">{task.title}</span>
        <div className="flex items-center gap-2">
          {task.status === 'pending' && (
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
          {task.status === 'in_progress' && (
            <Button size="sm" variant="destructive" onClick={() => { setPhotoAction('end'); setIsPhotoDialogOpen(true); }}>
              <Camera className="mr-2 h-4 w-4" /> Finalizar
            </Button>
          )}
          {task.status === 'pending_approval' && (profile?.role === 'admin' || profile?.role === 'supervisor') && (
            <Button size="sm" variant="default" onClick={handleApproveTask} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar
            </Button>
          )}
          {(task.signed_start_photo_url || task.signed_end_photo_url) && (
            <Dialog open={isViewingPhotos} onOpenChange={setIsViewingPhotos}>
              <DialogTrigger asChild><Button variant="outline" size="icon"><ImageIcon className="h-4 w-4" /></Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Fotos da Tarefa: {task.title}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {task.signed_start_photo_url && (<div><h3 className="font-semibold mb-2">Foto de Início</h3><img src={task.signed_start_photo_url} alt="Foto de início" className="rounded-md" /></div>)}
                  {task.signed_end_photo_url && (<div><h3 className="font-semibold mb-2">Foto de Fim</h3><img src={task.signed_end_photo_url} alt="Foto de fim" className="rounded-md" /></div>)}
                </div>
              </DialogContent>
            </Dialog>
          )}
          {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita e irá deletar a tarefa "{task.title}".</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTask} className="bg-destructive hover:bg-destructive/90">Deletar</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      {task.profiles && (
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2 mt-2">
          <div className="flex items-center gap-2"><User className="h-3 w-3" /><span>{task.profiles.full_name}</span></div>
          {task.status === 'approved' && task.profiles.hourly_cost && (<div className="flex items-center gap-2 font-mono"><DollarSign className="h-3 w-3" /><span>Custo: R$ {((calculateDuration().seconds / 3600) * (task.profiles.hourly_cost || 0)).toFixed(2).replace('.', ',')}</span></div>)}
        </div>
      )}
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Capturar Foto de {photoAction === 'start' ? 'Início' : 'Fim'}</DialogTitle><DialogDescription>Centralize o objeto da foto e clique em "Tirar Foto".</DialogDescription></DialogHeader>
          <PhotoCapture onPhotoTaken={handlePhotoTaken} onCancel={() => setIsPhotoDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DemandDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useSession();
  const [demand, setDemand] = useState<Demand | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [newStartDate, setNewStartDate] = useState<Date | undefined>();

  const forceRefresh = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) { setLoading(false); return; }
      setLoading(true);
      try {
        const { data: demandData, error: demandError } = await supabase.from("demands").select("*, locations(*)").eq("id", id).single();
        if (demandError) throw demandError;
        setDemand(demandData);
        if (demandData?.start_date) {
          setNewStartDate(new Date(demandData.start_date + 'T00:00:00'));
        }

        const { data: tasksData, error: tasksError } = await supabase.from("tasks").select("*, profiles!left(*)").eq("demand_id", id).order("created_at", { ascending: true });
        if (tasksError) throw tasksError;

        const signedTasks = await Promise.all(
          (tasksData || []).map(async (task) => {
            let signed_start_photo_url = null;
            if (task.start_photo_url) {
              const { data } = await supabase.storage.from('task-photos').createSignedUrl(task.start_photo_url, 3600);
              signed_start_photo_url = data?.signedUrl;
            }
            let signed_end_photo_url = null;
            if (task.end_photo_url) {
              const { data } = await supabase.storage.from('task-photos').createSignedUrl(task.end_photo_url, 3600);
              signed_end_photo_url = data?.signedUrl;
            }
            return { ...task, signed_start_photo_url, signed_end_photo_url };
          })
        );
        setTasks(signedTasks);

      } catch (error) {
        showError("Falha ao carregar detalhes da demanda.");
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
    const { error } = await supabase.from("tasks").insert({ title: newTaskTitle, demand_id: id });
    if (error) {
      showError("Falha ao adicionar tarefa.");
    } else {
      showSuccess("Tarefa adicionada com sucesso!");
      setNewTaskTitle("");
      setIsTaskDialogOpen(false);
      forceRefresh();
    }
  };

  const handleUpdateDate = async () => {
    if (!newStartDate || !demand) {
      showError("Por favor, selecione uma nova data.");
      return;
    }
    const formattedDate = newStartDate.toISOString().split('T')[0];
    const { error } = await supabase.from('demands').update({ start_date: formattedDate }).eq('id', demand.id);

    if (error) {
      showError("Falha ao atualizar a data.");
    } else {
      showSuccess("Data da demanda atualizada com sucesso!");
      setIsDatePickerOpen(false);
      forceRefresh();
    }
  };

  if (loading) return <div className="p-4 text-center">Carregando...</div>;
  if (!demand) return <div className="p-4 text-center">Demanda não encontrada.</div>;

  const totalSeconds = calculateTotalDuration(tasks.filter(t => t.status === 'approved'));
  const totalCost = tasks.reduce((acc, task) => {
    if (task.status === 'approved' && task.profiles?.hourly_cost) {
      const start = new Date(task.started_at!).getTime();
      const end = new Date(task.completed_at!).getTime();
      const hours = (end - start) / (1000 * 60 * 60);
      return acc + hours * task.profiles.hourly_cost;
    }
    return acc;
  }, 0);

  return (
    <div className="space-y-6">
      {demand.locations && (
        <Link to={`/locations/${demand.locations.id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Voltar para os Detalhes do Local
        </Link>
      )}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{demand.title}</CardTitle>
              {demand.locations && (
                <CardDescription className="flex items-center gap-2 pt-1">
                  <MapPin className="h-4 w-4" /> {formatAddress(demand.locations)}
                </CardDescription>
              )}
            </div>
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
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>Data de Início:</span>
              <span>{demand.start_date ? format(new Date(demand.start_date + 'T00:00:00'), "PPP", { locale: ptBR }) : "Não definida"}</span>
            </div>
            {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newStartDate}
                    onSelect={setNewStartDate}
                    initialFocus
                    locale={ptBR}
                  />
                  <div className="p-2 border-t">
                    <Button onClick={handleUpdateDate} className="w-full" size="sm">Salvar Data</Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} onUpdate={forceRefresh} demandStartDate={demand.start_date} profile={profile} />
            ))}
          </div>
          {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
            <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Tarefa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Nova Tarefa</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-title">Título da Tarefa</Label>
                    <Input id="task-title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Ex: Verificar fiação" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddTask}>Salvar Tarefa</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DemandDetails;
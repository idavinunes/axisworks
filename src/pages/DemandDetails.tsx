import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Demand, Task, Profile, TaskStatus, MaterialCost } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import PhotoCapture from "@/components/PhotoCapture";
import { PlusCircle, Camera, ArrowLeft, Trash2, MapPin, CheckCircle2, Clock, Image as ImageIcon, CalendarIcon, User, DollarSign, Pencil, Hourglass, BadgeCheck, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAddress } from "@/utils/address";
import { calculateTotalDuration, formatTotalTime } from "@/utils/time";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSession } from "@/contexts/SessionContext";
import { useDemandDetails } from "@/hooks/useDemandDetails";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Geolocation {
  latitude: number;
  longitude: number;
}

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

  const handlePhotoTaken = async (photoDataUrl: string, location: Geolocation | null) => {
    if (!photoAction || !profile) return;

    if (!location) {
      showError("Não foi possível obter a localização. A foto não será salva.");
      setIsPhotoDialogOpen(false);
      return;
    }

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
        start_latitude: location.latitude,
        start_longitude: location.longitude,
      };
    } else {
      updatePayload = {
        end_photo_url: functionData.path,
        completed_at: new Date().toISOString(),
        status: 'pending_approval',
        end_latitude: location.latitude,
        end_longitude: location.longitude,
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

  const renderMapLink = (lat?: number | null, lng?: number | null) => {
    if (!lat || !lng) return null;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="icon"><MapPin className="h-4 w-4 text-blue-500" /></Button>
            </a>
          </TooltipTrigger>
          <TooltipContent><p>Ver localização no mapa</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderPrimaryAction = () => {
    if (task.status === 'pending') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">
                <Button size="lg" className="w-full" onClick={() => { setPhotoAction('start'); setIsPhotoDialogOpen(true); }} disabled={!canStartTask}>
                  <Camera className="mr-2 h-5 w-5" /> Iniciar Tarefa
                </Button>
              </div>
            </TooltipTrigger>
            {!canStartTask && <TooltipContent><p>A tarefa só pode ser iniciada na data agendada.</p></TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (task.status === 'in_progress') {
      return (
        <Button size="lg" variant="destructive" className="w-full" onClick={() => { setPhotoAction('end'); setIsPhotoDialogOpen(true); }}>
          <Camera className="mr-2 h-5 w-5" /> Finalizar Tarefa
        </Button>
      );
    }
    if (task.status === 'pending_approval' && (profile?.role === 'admin' || profile?.role === 'supervisor')) {
      return (
        <Button size="lg" className="w-full bg-green-600 hover:bg-green-700" onClick={handleApproveTask}>
          <CheckCircle2 className="mr-2 h-5 w-5" /> Aprovar Tarefa
        </Button>
      );
    }
    return null;
  };

  const renderSecondaryActions = () => (
    <div className="flex items-center justify-between mt-2 pt-3 border-t">
      <div>
        {(task.signed_start_photo_url || task.signed_end_photo_url) && (
          <Dialog open={isViewingPhotos} onOpenChange={setIsViewingPhotos}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <ImageIcon className="mr-2 h-4 w-4" /> Ver Fotos
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Fotos da Tarefa: {task.title}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {task.signed_start_photo_url && (<div><h3 className="font-semibold mb-2">Foto de Início</h3><img src={task.signed_start_photo_url} alt="Foto de início" className="rounded-md" />{renderMapLink(task.start_latitude, task.start_longitude)}</div>)}
                {task.signed_end_photo_url && (<div><h3 className="font-semibold mb-2">Foto de Fim</h3><img src={task.signed_end_photo_url} alt="Foto de fim" className="rounded-md" />{renderMapLink(task.end_latitude, task.end_longitude)}</div>)}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div>
        {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive h-9 w-9">
                <Trash2 className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita e irá deletar a tarefa "{task.title}".</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTask} className="bg-destructive hover:bg-destructive/90">Deletar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 pt-1">
            {renderStatus()}
          </div>
          <div className="flex-grow">
            <p className="font-semibold text-base break-words">{task.title}</p>
            {task.profiles && (
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <User className="h-3 w-3" />
                <span>{task.profiles.full_name}</span>
              </div>
            )}
          </div>
        </div>
        
        {renderPrimaryAction()}
        
        {task.status === 'approved' && task.started_at && task.completed_at && (
          <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3 mt-3">
            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span>{formatTotalTime(calculateDuration().seconds)}</span></div>
            {task.profiles?.hourly_cost && task.profiles.hourly_cost > 0 && (
              <div className="flex items-center gap-2 font-mono font-semibold"><DollarSign className="h-4 w-4" /><span>Custo: ${((calculateDuration().seconds / 3600) * (task.profiles.hourly_cost || 0)).toFixed(2)}</span></div>
            )}
          </div>
        )}

        {renderSecondaryActions()}
      </CardContent>
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Capturar Foto de {photoAction === 'start' ? 'Início' : 'Fim'}</DialogTitle><DialogDescription>Centralize o objeto da foto e clique em "Tirar Foto". A sua localização será registrada.</DialogDescription></DialogHeader>
          <PhotoCapture onPhotoTaken={handlePhotoTaken} onCancel={() => setIsPhotoDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const DemandDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { profile, user } = useSession();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useDemandDetails(id);

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isCostDialogOpen, setIsCostDialogOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newCostDescription, setNewCostDescription] = useState("");
  const [newCostAmount, setNewCostAmount] = useState("");
  const [newStartDate, setNewStartDate] = useState<Date | undefined>();

  useEffect(() => {
    if (data?.demand?.start_date) {
      setNewStartDate(new Date(data.demand.start_date + 'T00:00:00'));
    }
  }, [data?.demand?.start_date]);

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
      refetch();
    }
  };

  const handleAddCost = async () => {
    if (!newCostDescription.trim() || !newCostAmount.trim() || !id || !user) {
      showError("Descrição e valor são obrigatórios.");
      return;
    }
    const amount = parseFloat(newCostAmount);
    if (isNaN(amount)) {
      showError("O valor deve ser um número.");
      return;
    }

    const { error } = await supabase.from("material_costs").insert({
      description: newCostDescription,
      amount,
      demand_id: id,
      user_id: user.id,
    });

    if (error) {
      showError("Falha ao adicionar custo.");
    } else {
      showSuccess("Custo adicionado com sucesso!");
      setNewCostDescription("");
      setNewCostAmount("");
      setIsCostDialogOpen(false);
      refetch();
    }
  };

  const handleDeleteCost = async (costId: string) => {
    const { error } = await supabase.from("material_costs").delete().eq("id", costId);
    if (error) {
      showError("Falha ao deletar custo.");
    } else {
      showSuccess("Custo deletado com sucesso.");
      refetch();
    }
  };

  const handleUpdateDate = async () => {
    if (!newStartDate || !data?.demand) {
      showError("Por favor, selecione uma nova data.");
      return;
    }
    const formattedDate = newStartDate.toISOString().split('T')[0];
    const { error } = await supabase.from('demands').update({ start_date: formattedDate }).eq('id', data.demand.id);

    if (error) {
      showError("Falha ao atualizar a data.");
    } else {
      showSuccess("Data da demanda atualizada com sucesso!");
      setIsDatePickerOpen(false);
      refetch();
    }
  };

  if (isLoading) return <div className="p-4 text-center">Carregando...</div>;
  if (error) return <div className="p-4 text-center text-destructive">Erro: {error.message}</div>;
  if (!data) return <div className="p-4 text-center">Demanda não encontrada.</div>;

  const { demand, tasks, materialCosts } = data;

  const laborTotalSeconds = calculateTotalDuration(tasks.filter(t => t.status === 'approved'));
  const laborTotalCost = tasks.reduce((acc, task) => {
    if (task.status === 'approved' && task.profiles?.hourly_cost && task.started_at && task.completed_at) {
      const start = new Date(task.started_at).getTime();
      const end = new Date(task.completed_at).getTime();
      const hours = (end - start) / (1000 * 60 * 60);
      return acc + hours * task.profiles.hourly_cost;
    }
    return acc;
  }, 0);

  const materialTotalCost = materialCosts.reduce((acc, cost) => acc + cost.amount, 0);
  const grandTotalCost = laborTotalCost + materialTotalCost;

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
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl">{demand.title}</CardTitle>
              {demand.locations && (
                <CardDescription className="flex items-center gap-2 pt-1">
                  <MapPin className="h-4 w-4" /> {formatAddress(demand.locations)}
                </CardDescription>
              )}
            </div>
            <div className="text-left sm:text-right flex-shrink-0 space-y-1">
              <div className="flex items-center sm:justify-end gap-2">
                <p className="font-bold text-lg">{formatTotalTime(laborTotalSeconds)}</p>
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex items-center sm:justify-end gap-2">
                <p className="font-bold text-lg text-green-600">$ {grandTotalCost.toFixed(2)}</p>
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </div>
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
                  <Calendar mode="single" selected={newStartDate} onSelect={setNewStartDate} initialFocus locale={ptBR} />
                  <div className="p-2 border-t"><Button onClick={handleUpdateDate} className="w-full" size="sm">Salvar Data</Button></div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} onUpdate={refetch} demandStartDate={demand.start_date} profile={profile} />
            ))}
          </div>
          {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
            <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
              <DialogTrigger asChild><Button variant="outline" className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Tarefa</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Adicionar Nova Tarefa</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2"><Label htmlFor="task-title">Título da Tarefa</Label><Input id="task-title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Ex: Verificar fiação" /></div>
                </div>
                <DialogFooter><Button onClick={handleAddTask}>Salvar Tarefa</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Custos de Material</CardTitle>
            <CardDescription>Total: <span className="font-bold text-primary">$ {materialTotalCost.toFixed(2)}</span></CardDescription>
          </div>
          {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
            <Dialog open={isCostDialogOpen} onOpenChange={setIsCostDialogOpen}>
              <DialogTrigger asChild><Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Custo ou Sobra</DialogTitle>
                  <DialogDescription>Descreva o item e seu valor. Use um valor negativo para sobras (crédito).</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2"><Label htmlFor="cost-desc">Descrição</Label><Input id="cost-desc" value={newCostDescription} onChange={(e) => setNewCostDescription(e.target.value)} placeholder="Ex: Rolo de fio 100m" /></div>
                  <div className="space-y-2"><Label htmlFor="cost-amount">Valor ($)</Label><Input id="cost-amount" type="number" value={newCostAmount} onChange={(e) => setNewCostAmount(e.target.value)} placeholder="Ex: 150.00 ou -25.00" /></div>
                </div>
                <DialogFooter><Button onClick={handleAddCost}>Salvar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {materialCosts.length > 0 ? (
            <ul className="space-y-2">
              {materialCosts.map(cost => (
                <li key={cost.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                  <span className="flex-grow">{cost.description}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-mono", cost.amount < 0 ? "text-green-600" : "text-destructive")}>
                      {cost.amount < 0 ? `- $${(-cost.amount).toFixed(2)}` : `$ ${cost.amount.toFixed(2)}`}
                    </span>
                    {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Deseja realmente remover o custo "{cost.description}"?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteCost(cost.id)} className="bg-destructive hover:bg-destructive/90">Deletar</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum custo de material adicionado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DemandDetails;
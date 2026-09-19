'use client';

import { useState, useEffect, lazy, Suspense, useMemo, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { 
  Plus, Zap, Trash2, CheckCircle2, Clock,
  Target, TrendingUp, Calendar as CalendarIcon, Search, Filter,
  Moon, Sun, Bell,
  Mic, Volume2, Loader2, Briefcase,
  User, BookOpen, X, Trophy, Timer, LayoutGrid, List,
  Archive, RotateCw, Minus, GripVertical,
  CircleDot, Clock3, Eye as EyeIcon, CheckCheck, MoreHorizontal,
  MicOff, Square, CheckSquare, RefreshCw
} from 'lucide-react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis';
import { loadTasksFromStorage, saveTasksToStorage, addTaskToStorage, updateTaskInStorage, removeTaskFromStorage } from '@/lib/task-helpers';
import { useStats } from '@/hooks/use-stats';
import { useFilteredTasks } from '@/hooks/use-filtered-tasks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ClockWidget, WeatherWidget } from '@/components/widgets';
import { TaskAlert } from '@/components/task-alert';
import { useTaskNotifications } from '@/hooks/use-task-notifications';
import { database, ref, onValue, set, push, update, remove } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { Task, Subtask, Tag, Category, Achievement } from '@/types/task';
import { buildTask, validateSubtasks } from '@/lib/task-factory';

const Calendar = lazy(() => import('@/components/ui/calendar').then(m => ({ default: m.Calendar })));
const Popover = lazy(() => import('@/components/ui/popover').then(m => ({ default: m.Popover })));
const PopoverContent = lazy(() => import('@/components/ui/popover').then(m => ({ default: m.PopoverContent })));
const PopoverTrigger = lazy(() => import('@/components/ui/popover').then(m => ({ default: m.PopoverTrigger })));
const Slider = lazy(() => import('@/components/ui/slider').then(m => ({ default: m.Slider })));

const kanbanColumns = [
  { id: 'open', label: 'Aberto', color: 'border-l-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-800', textColor: 'text-slate-700 dark:text-slate-200', icon: CircleDot },
  { id: 'pending', label: 'Pendente', color: 'border-l-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/50', textColor: 'text-yellow-700 dark:text-yellow-300', icon: Clock3 },
  { id: 'in_progress', label: 'Em Processo', color: 'border-l-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/50', textColor: 'text-blue-700 dark:text-blue-300', icon: TrendingUp },
  { id: 'review', label: 'Revisão', color: 'border-l-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/50', textColor: 'text-purple-700 dark:text-purple-300', icon: EyeIcon },
  { id: 'completed', label: 'Concluído', color: 'border-l-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/50', textColor: 'text-emerald-700 dark:text-emerald-300', icon: CheckCheck },
];

const reminderOptions = [
  { value: 5, label: '5 min antes' },
  { value: 15, label: '15 min antes' },
  { value: 30, label: '30 min antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
  { value: 1440, label: '1 dia antes' },
];

const defaultTags: Tag[] = [
  { id: 'urgent', name: 'Urgente', color: '#ef4444' },
  { id: 'importante', name: 'Importante', color: '#f97316' },
  { id: 'reuniao', name: 'Reunião', color: '#8b5cf6' },
  { id: 'chamada', name: 'Ligação', color: '#06b6d4' },
  { id: 'email', name: 'Email', color: '#3b82f6' },
  { id: 'presencial', name: 'Presencial', color: '#10b981' },
];

const achievementsList: Achievement[] = [
  { id: 'first_task', name: 'Primeiro Passo', description: 'Crie sua primeira tarefa', icon: '🌟', unlocked: false },
  { id: 'ten_tasks', name: 'Dedicado', description: 'Crie 10 tarefas', icon: '📝', unlocked: false },
  { id: 'first_complete', name: 'Missão Cumprida', description: 'Complete sua primeira tarefa', icon: '✅', unlocked: false },
  { id: 'ten_complete', name: 'Produtivo', description: 'Complete 10 tarefas', icon: '🚀', unlocked: false },
  { id: 'streak_3', name: 'Sequência', description: 'Complete tarefas 3 dias seguidos', icon: '🔥', unlocked: false },
  { id: 'streak_7', name: 'Invencível', description: 'Complete tarefas 7 dias seguidos', icon: '💪', unlocked: false },
  { id: 'all_categories', name: 'Diversificado', description: 'Use todas as categorias', icon: '🎨', unlocked: false },
  { id: 'high_priority', name: 'Desafio Aceito', description: 'Complete 5 tarefas urgentes', icon: '⚡', unlocked: false },
];

const categoryConfig = {
  trabalho: { label: 'Trabalho', icon: Briefcase, color: 'bg-indigo-500', textColor: 'text-indigo-600', bgLight: 'bg-indigo-50 dark:bg-indigo-950' },
  pessoal: { label: 'Pessoal', icon: User, color: 'bg-emerald-500', textColor: 'text-emerald-600', bgLight: 'bg-emerald-50 dark:bg-emerald-950' },
  estudos: { label: 'Estudos', icon: BookOpen, color: 'bg-amber-500', textColor: 'text-amber-600', bgLight: 'bg-amber-50 dark:bg-amber-950' },
};

function formatLocalDate(dateStr: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return '';
  const [datePart, timePart] = dateStr.split('T');
  if (!datePart) return '';
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart ? timePart.split(':').map(Number) : [0, 0];
  const date = new Date(year, month - 1, day, hours, minutes);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  return date.toLocaleDateString('pt-BR', defaultOptions);
}

const priorityConfig = {
  low: { color: 'bg-slate-500', textColor: 'text-slate-500', label: 'Baixa' },
  medium: { color: 'bg-blue-500', textColor: 'text-blue-500', label: 'Média' },
  high: { color: 'bg-orange-500', textColor: 'text-orange-500', label: 'Alta' },
  urgent: { color: 'bg-red-500', textColor: 'text-red-500', label: 'Urgente' },
};

const energyConfig = {
  1: { label: 'Muito Baixa', emoji: '😌', color: 'from-green-400 to-green-500' },
  2: { label: 'Baixa', emoji: '🙂', color: 'from-emerald-400 to-emerald-500' },
  3: { label: 'Média', emoji: '😊', color: 'from-yellow-400 to-yellow-500' },
  4: { label: 'Alta', emoji: '🔥', color: 'from-orange-400 to-orange-500' },
  5: { label: 'Muito Alta', emoji: '⚡', color: 'from-red-400 to-red-500' },
};

const SortableTask = memo(function SortableTask({ task, onClick, categories }: { task: Task; onClick: () => void; categories: Category[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const taskCategory = categories.find(c => c.id === task.categoryId);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className={`p-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${isDragging ? 'ring-2 ring-purple-400' : ''}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('[data-drag-handle]')) return;
          onClick();
        }}>
        <div className="flex items-center gap-1 mb-1.5 flex-wrap">
          <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0 cursor-grab" data-drag-handle />
          <Badge variant="secondary" className={`text-[9px] py-0 ${priorityConfig[task.priority].textColor}`}>
            {priorityConfig[task.priority].label}
          </Badge>
          {taskCategory && (
            <Badge variant="outline" className="text-[9px] py-0" style={{ borderColor: taskCategory.color, color: taskCategory.color }}>
              {categoryConfig[taskCategory.id as keyof typeof categoryConfig]?.label}
            </Badge>
          )}
          {task.recurring && task.recurring !== 'none' && (
            <Badge variant="outline" className="text-[9px] py-0 text-cyan-600 border-cyan-300">
              <RotateCw className="w-2.5 h-2.5" />
            </Badge>
          )}
        </div>
        <h4 className="font-medium text-xs md:text-sm mb-1 line-clamp-2 break-words">{task.title}</h4>
        {task.description && (
          <p className="text-[10px] md:text-xs text-slate-500 line-clamp-2 mb-2 break-words">{task.description}</p>
        )}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {task.tags.slice(0, 2).map(tagId => {
              const tag = defaultTags.find(t => t.id === tagId);
              return tag ? (
                <Badge key={tagId} variant="secondary" className="text-[8px] px-1 py-0" style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>
                  {tag.name}
                </Badge>
              ) : null;
            })}
          </div>
        )}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${(task.subtasks.filter(st => st.completed).length / task.subtasks.length) * 100}%` }} />
            </div>
            <span className="text-[9px] text-slate-500">{task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-[9px] md:text-[10px] text-slate-400">
          {task.dueDate && (
            <span className="flex items-center gap-0.5 truncate">
              <CalendarIcon className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{formatLocalDate(task.dueDate)}</span>
            </span>
          )}
          <span className="flex-shrink-0 ml-1">+{task.points}pts</span>
        </div>
      </Card>
    </div>
  );
});

const DroppableColumn = memo(function DroppableColumn({ columnId, children, isOver }: { columnId: string; children: React.ReactNode; isOver: boolean }) {
  return (
    <div className={`transition-colors min-h-[100px] rounded-lg ${isOver ? 'bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-400 ring-dashed' : ''}`}>
      {children}
    </div>
  );
});

function DroppableZone({ id, children }: { id: string; children: (isOver: boolean) => React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef}>
      {children(isOver)}
    </div>
  );
}

export default function NexusApp() {
  const router = useRouter();
  const { user, loading: authLoading, logout, displayName, setDisplayName } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories] = useState<Category[]>([
    { id: 'trabalho', name: 'Trabalho', color: '#6366f1', icon: 'Briefcase' },
    { id: 'pessoal', name: 'Pessoal', color: '#10b981', icon: 'User' },
    { id: 'estudos', name: 'Estudos', color: '#f59e0b', icon: 'BookOpen' },
  ]);
  const [tags] = useState<Tag[]>(defaultTags);
  const [achievements, setAchievements] = useState<Achievement[]>(achievementsList);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'tarefas' | 'kanban'>('tarefas');
  const [activeTask, setActiveTask] = useState<Task | null | undefined>(undefined);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isVoiceCreateOpen, setIsVoiceCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null | undefined>(undefined);
  const [showAchievements, setShowAchievements] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [pomodoroTaskId, setPomodoroTaskId] = useState<string | null>(null);
  const [pomodoroSession, setPomodoroSession] = useState<'work' | 'break'>('work');

  const [formData, setFormData] = useState({
    title: '', description: '', priority: 'medium' as Task['priority'],
    energyLevel: 3, dueDate: '', categoryId: null as string | null, tags: [] as string[], recurring: 'none' as Task['recurring'], reminders: [] as number[],
    subtasks: [] as Subtask[],
  });

  const {
    transcript,
    isListening,
    isSupported: speechRecognitionSupported,
    startListening,
    stopListening,
    resetTranscript,
    clearError,
    error: speechError,
  } = useSpeechRecognition();

  const {
    speak,
    stop: stopSpeaking,
    isSpeaking,
    isSupported: speechSynthesisSupported,
  } = useSpeechSynthesis();

  const [readingTaskId, setReadingTaskId] = useState<string | null>(null);

  const [voiceTitle, setVoiceTitle] = useState('');
  const [voiceDescription, setVoiceDescription] = useState('');
  const [isListeningTitle, setIsListeningTitle] = useState(false);
  const [isListeningDescription, setIsListeningDescription] = useState(false);

  const { activeAlert, dismissAlert, scheduleTaskNotification, requestNotificationPermission } = useTaskNotifications(tasks);

  const stats = useStats(tasks);

  // Verificar autenticação
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Carregar tarefas (Firebase ou localStorage)
  useEffect(() => {
    if (database && user) {
      const tasksRef = ref(database, `users/${user.uid}/tasks`);
      const unsubscribe = onValue(tasksRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const taskList = Object.entries(data).map(([id, task]) => ({
            id,
            ...(task as Omit<Task, 'id'>)
          }));
          setTasks(taskList.sort((a, b) => b.createdAt - a.createdAt));
          localStorage.setItem('nexus_tasks', JSON.stringify(taskList.sort((a, b) => b.createdAt - a.createdAt)));
        } else {
          setTasks([]);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else if (!database) {
      setTasks(loadTasksFromStorage());
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const savedAchievements = localStorage.getItem('nexus_achievements');
    if (savedAchievements) {
      try {
        setAchievements(JSON.parse(savedAchievements));
      } catch {
        localStorage.removeItem('nexus_achievements');
      }
    }
  }, []);

  // Pomodoro timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pomodoroActive && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime(prev => prev - 1);
      }, 1000);
    } else if (pomodoroTime === 0) {
      const canNotify = typeof Notification !== 'undefined' && Notification.permission === 'granted';
      if (pomodoroSession === 'work') {
        if (canNotify) new Notification('Pomodoro Concluído!', { body: 'Hora de uma pausa!' });
        toast({ title: 'Pomodoro Concluído!', description: 'Hora de uma pausa de 5 minutos.' });
        setPomodoroSession('break');
        setPomodoroTime(5 * 60);
      } else {
        if (canNotify) new Notification('Pausa Terminada!', { body: 'Hora de voltar ao trabalho!' });
        toast({ title: 'Pausa Terminada!', description: 'Vamos voltar ao trabalho?' });
        setPomodoroSession('work');
        setPomodoroTime(25 * 60);
        setPomodoroActive(false);
      }
    }
    return () => clearInterval(interval);
  }, [pomodoroActive, pomodoroTime, pomodoroSession]);

  // Check achievements
  const achievementsSaveRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (tasks.length === 0) return;
    if (achievements.every(a => a.unlocked)) return;
    
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const urgentCompleted = completedTasks.filter(t => t.priority === 'urgent');
    const usedCategories = new Set(tasks.filter(t => t.categoryId).map(t => t.categoryId));

    setAchievements(prev => {
      const updated = prev.map(a => {
        if (a.unlocked) return a;
        let shouldUnlock = false;
        switch (a.id) {
          case 'first_task': shouldUnlock = tasks.length >= 1; break;
          case 'ten_tasks': shouldUnlock = tasks.length >= 10; break;
          case 'first_complete': shouldUnlock = completedTasks.length >= 1; break;
          case 'ten_complete': shouldUnlock = completedTasks.length >= 10; break;
          case 'streak_3': shouldUnlock = stats.streak >= 3; break;
          case 'streak_7': shouldUnlock = stats.streak >= 7; break;
          case 'all_categories': shouldUnlock = usedCategories.size >= 3; break;
          case 'high_priority': shouldUnlock = urgentCompleted.length >= 5; break;
        }
        if (shouldUnlock) {
          toast({ title: `🏆 Conquista: ${a.name}!`, description: a.description });
          return { ...a, unlocked: true, unlockedAt: Date.now() };
        }
        return a;
      });
      if (achievementsSaveRef.current) clearTimeout(achievementsSaveRef.current);
      achievementsSaveRef.current = setTimeout(() => {
        localStorage.setItem('nexus_achievements', JSON.stringify(updated));
      }, 300);
      return updated;
    });
  }, [tasks, stats.streak]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    setActiveTask(task || undefined);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as Task['status'];

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    if (['open', 'pending', 'in_progress', 'review', 'completed'].includes(newStatus)) {
      const updates: Partial<Task> = { status: newStatus as Task['status'] };
      if (newStatus === 'completed') {
        updates.completedAt = Date.now();
      }
      handleUpdateTaskDirect(taskId, updates);
      toast({ title: 'Status atualizado', description: `Tarefa movida para ${kanbanColumns.find(c => c.id === newStatus)?.label}` });
    }
  };

  const handleVoiceCreate = () => {
    setIsVoiceCreateOpen(true);
    setVoiceTitle('');
    setVoiceDescription('');
    resetTranscript();
  };

  const handleStartListeningTitle = () => {
    setIsListeningTitle(true);
    resetTranscript();
    startListening();
  };

  const handleStopListeningTitle = () => {
    stopListening();
    setIsListeningTitle(false);
    if (transcript.trim()) {
      setVoiceTitle(transcript.trim());
      toast({ title: 'Título detectado', description: transcript.trim() });
    }
  };

  const handleStartListeningDescription = () => {
    setIsListeningDescription(true);
    resetTranscript();
    startListening();
  };

  const handleStopListeningDescription = () => {
    stopListening();
    setIsListeningDescription(false);
    if (transcript.trim()) {
      const newDescription = voiceDescription ? `${voiceDescription} ${transcript.trim()}` : transcript.trim();
      setVoiceDescription(newDescription.trim());
      toast({ title: 'Descrição adicionada', description: transcript.trim() });
    }
  };

  const handleConfirmVoiceCreate = async () => {
    if (!voiceTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const newTask = buildTask({
        title: voiceTitle.trim(),
        description: voiceDescription.trim() || undefined,
        priority: formData.priority,
        energyLevel: formData.energyLevel,
        dueDate: formData.dueDate || undefined,
        categoryId: formData.categoryId || undefined,
        tags: formData.tags,
        recurring: formData.recurring,
        subtasks: formData.subtasks,
        reminders: formData.reminders,
      }, 'pending');

      if (database && user) {
        const tasksRef = ref(database, `users/${user.uid}/tasks/${newTask.id}`);
        await set(tasksRef, newTask);
      } else {
        setTasks(addTaskToStorage(newTask));
      }

      if (formData.dueDate) {
        scheduleTaskNotification(newTask);
      }

      setIsVoiceCreateOpen(false);
      setVoiceTitle('');
      setVoiceDescription('');
      setFormData({ title: '', description: '', priority: 'medium', energyLevel: 3, dueDate: '', categoryId: null, tags: [], recurring: 'none', subtasks: [], reminders: [] });
      toast({ title: 'Sucesso', description: 'Tarefa criada por voz!' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReadTask = (task: Task) => {
    if (readingTaskId === task.id) {
      stopSpeaking();
      setReadingTaskId(null);
      return;
    }

    stopSpeaking();
    
    const priorityLabels: Record<string, string> = {
      low: 'baixa',
      medium: 'média',
      high: 'alta',
      urgent: 'urgente',
    };

    const statusLabels: Record<string, string> = {
      pending: 'pendente',
      in_progress: 'em progresso',
      completed: 'concluída',
      cancelled: 'cancelada',
    };

    const energyLabels: Record<number, string> = {
      1: 'energia muito baixa',
      2: 'energia baixa',
      3: 'energia média',
      4: 'energia alta',
      5: 'energia muito alta',
    };

    let text = `Tarefa: ${task.title}. `;
    text += `Prioridade: ${priorityLabels[task.priority]}. `;
    text += `Status: ${statusLabels[task.status]}. `;
    text += `Energia necessária: ${energyLabels[task.energyLevel]}. `;
    
    if (task.description) {
      text += `Descrição: ${task.description}. `;
    }
    
    if (task.dueDate) {
      const formattedDate = formatLocalDate(task.dueDate, { day: '2-digit', month: 'long', year: 'numeric' });
      text += `Data de vencimento: ${formattedDate}. `;
    }

    text += `Vale ${task.points} pontos.`;

    speak(text);
    setReadingTaskId(task.id);
  };

  useEffect(() => {
    if (!isSpeaking && readingTaskId) {
      setReadingTaskId(null);
    }
  }, [isSpeaking, readingTaskId]);

  const handleCreateTask = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'Erro', description: 'Título é obrigatório', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newTask = buildTask({
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        energyLevel: formData.energyLevel,
        dueDate: formData.dueDate || undefined,
        categoryId: formData.categoryId || undefined,
        tags: formData.tags,
        recurring: formData.recurring,
        subtasks: formData.subtasks,
        reminders: formData.reminders,
      }, 'pending');

      if (database && user) {
        try {
          const tasksRef = ref(database, `users/${user.uid}/tasks/${newTask.id}`);
          await set(tasksRef, newTask);
        } catch {
          toast({ title: 'Erro', description: 'Falha ao salvar tarefa no servidor', variant: 'destructive' });
          return;
        }
      } else {
        setTasks(addTaskToStorage(newTask));
      }

      if (formData.dueDate) {
        scheduleTaskNotification(newTask);
      }

      toast({ title: 'Sucesso', description: 'Tarefa criada!' });
      setIsCreateOpen(false);
      setFormData({ title: '', description: '', priority: 'medium', energyLevel: 3, dueDate: '', categoryId: null, tags: [], recurring: 'none', subtasks: [], reminders: [] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async (task: Task) => {
    const updates: Partial<Task> = { status: 'completed', completedAt: Date.now() };

    if (task.recurring && task.recurring !== 'none') {
      const nextDueDate = new Date(task.dueDate || Date.now());
      switch (task.recurring) {
        case 'daily': nextDueDate.setDate(nextDueDate.getDate() + 1); break;
        case 'weekly': nextDueDate.setDate(nextDueDate.getDate() + 7); break;
        case 'monthly': nextDueDate.setMonth(nextDueDate.getMonth() + 1); break;
      }
      
      const newTask: Task = {
        ...task,
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        dueDate: nextDueDate.toISOString().slice(0, 16),
        createdAt: Date.now(),
        subtasks: task.subtasks ? task.subtasks.map(st => ({ id: st.id, title: st.title, completed: false })) : null,
      };

      if (database && user) {
        try {
          const taskRef = ref(database, `users/${user.uid}/tasks/${task.id}`);
          await update(taskRef, updates);
          const newTaskRef = ref(database, `users/${user.uid}/tasks/${newTask.id}`);
          await set(newTaskRef, newTask);
        } catch {
          toast({ title: 'Erro', description: 'Falha ao atualizar tarefa no servidor', variant: 'destructive' });
          return;
        }
      } else {
        const existing = loadTasksFromStorage();
        const updated = existing.map(t => t.id === task.id ? { ...t, ...updates } : t);
        updated.push(newTask);
        saveTasksToStorage(updated);
        setTasks(updated);
      }
      toast({ title: 'Tarefa concluída!', description: `Próxima ocorrência agendada para ${formatLocalDate(newTask.dueDate)}` });
    } else {
      handleUpdateTaskDirect(task.id, updates);
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    handleUpdateTaskDirect(id, updates);
    setEditingTask(null);
  };

  const handleUpdateTaskDirect = async (id: string, updates: Partial<Task>) => {
    if (database && user) {
      try {
        const taskRef = ref(database, `users/${user.uid}/tasks/${id}`);
        await update(taskRef, updates);
      } catch {
        toast({ title: 'Erro', description: 'Falha ao atualizar tarefa no servidor', variant: 'destructive' });
        return;
      }
    } else {
      setTasks(updateTaskInStorage(id, updates));
    }
    toast({ title: 'Sucesso', description: 'Tarefa atualizada!' });
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;
    
    const updatedSubtasks: Array<{id: string, title: string, completed: boolean}> = [];
    for (const st of task.subtasks) {
      if (st && st.id && st.title !== undefined) {
        updatedSubtasks.push({
          id: String(st.id),
          title: String(st.title),
          completed: st.id === subtaskId ? !st.completed : Boolean(st.completed)
        });
      }
    }
    
    handleUpdateTaskDirect(taskId, { subtasks: updatedSubtasks });
    setEditingTask({ ...task, subtasks: updatedSubtasks });
  };

  const handleArchiveTask = async (id: string) => {
    await handleUpdateTaskDirect(id, { status: 'archived', archivedAt: Date.now() });
    toast({ title: 'Arquivada', description: 'Tarefa movida para arquivo' });
  };

  const handleDeleteTask = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteTask = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    if (database && user) {
      try {
        const taskRef = ref(database, `users/${user.uid}/tasks/${id}`);
        await remove(taskRef);
      } catch {
        toast({ title: 'Erro', description: 'Falha ao excluir tarefa no servidor', variant: 'destructive' });
        return;
      }
    } else {
      setTasks(removeTaskFromStorage(id));
    }
    toast({ title: 'Sucesso', description: 'Tarefa excluída!' });
  };

  const unlockedAchievements = achievements.filter(a => a.unlocked).length;
  const { filteredTasks, tasksByEnergy } = useFilteredTasks(tasks, debouncedSearch, statusFilter);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md safe-area-inset-top">
        <div className="px-2 py-2 md:px-3 md:py-3">
          <div className="flex items-center justify-between gap-1 md:gap-2">
            <div className="flex items-center gap-1 md:gap-2">
              <motion.div
                className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center"
                animate={{
                  background: [
                    'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    'linear-gradient(135deg, #3b82f6, #06b6d4)',
                    'linear-gradient(135deg, #10b981, #84cc16)',
                    'linear-gradient(135deg, #f59e0b, #ef4444)',
                    'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  ],
                }}
                transition={{ duration: 8, repeat: Infinity }}
              >
                <Target className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-sm sm:text-lg md:text-xl font-bold flex">
                  {[
                    { letter: 'N', color: 'text-purple-600' },
                    { letter: 'e', color: 'text-pink-600' },
                    { letter: 'x', color: 'text-blue-600' },
                    { letter: 'u', color: 'text-cyan-600' },
                    { letter: 's', color: 'text-yellow-500' },
                  ].map((item, index) => (
                    <motion.span
                      key={index}
                      className={item.color}
                      animate={{
                        y: [0, -2, 0, 2, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: index * 0.1,
                      }}
                    >
                      {item.letter}
                    </motion.span>
                  ))}
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">Agenda Inteligente</p>
                <div className="flex items-center gap-1">
                  {(displayName || user?.email) && (
                    <p className="text-[9px] sm:text-[10px] text-slate-400 hidden sm:block">
                      {displayName || user?.email}
                    </p>
                  )}
                  <button 
                    onClick={() => {
                      const newName = prompt('Digite seu nome:', displayName || user?.displayName || '');
                      if (newName && newName.trim()) {
                        setDisplayName(newName.trim());
                      }
                    }}
                    className="text-[9px] text-purple-500 hover:text-purple-600 hidden sm:block"
                    title="Alterar nome"
                    aria-label="Alterar nome"
                  >
                    ✏️
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              <div className="hidden lg:flex items-center gap-2">
                <ClockWidget />
                <WeatherWidget />
              </div>
              
              {pomodoroActive && (
                <Badge variant="default" className="gap-1 px-2 py-1 text-xs bg-red-500 animate-pulse">
                  <Timer className="w-3 h-3" />
                  <span>{Math.floor(pomodoroTime / 60)}:{(pomodoroTime % 60).toString().padStart(2, '0')}</span>
                </Badge>
              )}
              
              <Button
                size="icon"
                variant={pomodoroActive ? "default" : "ghost"}
                className={`w-9 h-9 md:w-10 md:h-10 ${pomodoroActive ? 'bg-red-500 hover:bg-red-600' : ''}`}
                onClick={() => {
                  if (pomodoroActive) {
                    setPomodoroActive(false);
                  } else {
                    setPomodoroTime(25 * 60);
                    setPomodoroActive(true);
                    setPomodoroSession('work');
                  }
                }}
              >
                <Timer className="w-4 h-4" />
              </Button>
              

              
              <Button size="icon" variant="ghost" className="w-9 h-9 md:w-10 md:h-10 relative" onClick={() => setShowAchievements(true)} aria-label={`Conquistas: ${unlockedAchievements} desbloqueadas`}>
                <Trophy className="w-4 h-4" />
                {unlockedAchievements > 0 && (
                  <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center" aria-hidden="true">
                    {unlockedAchievements}
                  </span>
                )}
              </Button>
              
              <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
                <Zap className="w-3 h-3 text-yellow-500" aria-hidden="true" />
                <span className="font-semibold hidden sm:inline">{stats.points} pts</span>
              </Badge>

              <Button variant="ghost" size="icon" onClick={requestNotificationPermission} title="Ativar notificações" aria-label="Ativar notificações">
                <Bell className="w-5 h-5" />
              </Button>

              <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={theme === 'light' ? 'Alternar para tema escuro' : 'Alternar para tema claro'}>
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={async () => {
                  try {
                    await logout();
                    router.push('/login');
                  } catch (error) {
                    console.error('Erro ao fazer logout:', error);
                  }
                }}
                title="Sair"
                aria-label="Sair da conta"
                className="text-red-500 hover:text-red-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </Button>

              {speechRecognitionSupported && (
                <Button 
                  variant="outline" 
                  size="icon"
                  className="w-9 h-9 md:w-10 md:h-10 text-purple-600 hover:text-purple-700"
                  onClick={handleVoiceCreate}
                  title="Criar tarefa por voz"
                  aria-label="Criar tarefa por voz"
                >
                  <Mic className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              )}

              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-1 md:gap-2 bg-gradient-to-r from-purple-500 to-pink-500 px-2 md:px-4">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nova</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100%-16px)] max-w-lg max-h-[85vh] overflow-y-auto p-4">
                  <DialogHeader className="pb-2">
                    <DialogTitle>Criar Nova Tarefa</DialogTitle>
                    <DialogDescription>Adicione uma nova tarefa</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Título *</Label>
                      <Input placeholder="Ex: Reunião com cliente" value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea placeholder="Detalhes..." value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
                    </div>
                    
                    <div>
                      <Label>Categoria</Label>
                      <div className="flex gap-2 mt-2">
                        {categories.map((cat) => {
                          const config = categoryConfig[cat.id as keyof typeof categoryConfig];
                          const Icon = config?.icon;
                          return (
                            <Button
                              key={cat.id}
                              type="button"
                              variant={formData.categoryId === cat.id ? "default" : "outline"}
                              size="sm"
                              onClick={() => setFormData({ ...formData, categoryId: cat.id })}
                              className={`flex-1 gap-1 ${formData.categoryId === cat.id ? config?.bgLight : ''}`}
                              style={formData.categoryId === cat.id ? { 
                                backgroundColor: cat.color + '20', 
                                borderColor: cat.color,
                                color: cat.color
                              } : {}}
                            >
                              {Icon && <Icon className="w-4 h-4" />}
                              {cat.name}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Prioridade</Label>
                        <Select value={formData.priority}
                          onValueChange={(v) => setFormData({ ...formData, priority: v as Task['priority'] })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">😌 Baixa</SelectItem>
                            <SelectItem value="medium">😊 Média</SelectItem>
                            <SelectItem value="high">🔥 Alta</SelectItem>
                            <SelectItem value="urgent">⚡ Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Energia</Label>
                        <Select value={String(formData.energyLevel)}
                          onValueChange={(v) => setFormData({ ...formData, energyLevel: Number(v) })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">😌 Muito Baixa</SelectItem>
                            <SelectItem value="2">🙂 Baixa</SelectItem>
                            <SelectItem value="3">😊 Média</SelectItem>
                            <SelectItem value="4">🔥 Alta</SelectItem>
                            <SelectItem value="5">⚡ Muito Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Data de Vencimento</Label>
                      <Suspense fallback={<div className="h-10 w-full border rounded-md bg-muted animate-pulse" />}>
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal mt-2 ${!formData.dueDate && 'text-muted-foreground'}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.dueDate ? (
                              formatLocalDate(formData.dueDate, {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            {formData.dueDate && (
                              <X 
                                className="ml-auto h-4 w-4 opacity-50 hover:opacity-100" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormData({ ...formData, dueDate: '' });
                                }}
                              />
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.dueDate ? (() => {
                              const [year, month, day] = formData.dueDate.split('T')[0].split('-');
                              return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                            })() : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const currentParts = formData.dueDate ? formData.dueDate.split('T') : null;
                                const currentTime = currentParts && currentParts[1] ? currentParts[1] : '09:00';
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                const localDateStr = `${year}-${month}-${day}T${currentTime}`;
                                setFormData({ ...formData, dueDate: localDateStr });
                              }
                            }}
                            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                          />
                          <div className="p-3 border-t">
                            <Label className="text-xs text-muted-foreground">Horário</Label>
                            <Input 
                              type="time"
                              value={formData.dueDate ? formData.dueDate.split('T')[1] || '09:00' : '09:00'}
                              onChange={(e) => {
                                if (formData.dueDate) {
                                  const [year, month, day] = formData.dueDate.split('T')[0].split('-');
                                  const [hours, minutes] = e.target.value.split(':');
                                  const localDateStr = `${year}-${month}-${day}T${hours}:${minutes}`;
                                  setFormData({ ...formData, dueDate: localDateStr });
                                }
                              }}
                              className="mt-1"
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      </Suspense>
                    </div>

                    {formData.dueDate && (
                      <div>
                        <Label>Lembretes</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {reminderOptions.map(option => (
                            <Button
                              key={option.value}
                              type="button"
                              size="sm"
                              variant={formData.reminders.includes(option.value) ? "default" : "outline"}
                              className="text-xs"
                              onClick={() => {
                                const newReminders = formData.reminders.includes(option.value)
                                  ? formData.reminders.filter(r => r !== option.value)
                                  : [...formData.reminders, option.value];
                                setFormData({ ...formData, reminders: newReminders });
                              }}
                            >
                              <Bell className="w-3 h-3 mr-1" />
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Recorrência</Label>
                        <Select value={formData.recurring || 'none'}
                          onValueChange={(v) => setFormData({ ...formData, recurring: v as Task['recurring'] })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Não recorrente</SelectItem>
                            <SelectItem value="daily">Diário</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Tags</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tags.slice(0, 4).map(tag => (
                            <Button
                              key={tag.id}
                              type="button"
                              size="sm"
                              variant={formData.tags.includes(tag.id) ? "default" : "outline"}
                              className="text-xs h-6 px-2"
                              style={formData.tags.includes(tag.id) ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                              onClick={() => {
                                const newTags = formData.tags.includes(tag.id)
                                  ? formData.tags.filter(t => t !== tag.id)
                                  : [...formData.tags, tag.id];
                                setFormData({ ...formData, tags: newTags });
                              }}
                            >
                              {tag.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Subtarefas</Label>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setFormData({
                            ...formData,
                            subtasks: [...formData.subtasks, { id: `st_${Date.now()}`, title: '', completed: false }]
                          });
                        }}>
                          <Plus className="w-3 h-3 mr-1" /> Adicionar
                        </Button>
                      </div>
                      {formData.subtasks.map((subtask, index) => (
                        <div key={subtask.id} className="flex items-center gap-2 mb-1">
                          <Minus className="w-4 h-4 text-slate-400" />
                          <Input
                            placeholder={`Subtarefa ${index + 1}`}
                            value={subtask.title}
                            onChange={(e) => {
                              const updated = formData.subtasks.map(st =>
                                st.id === subtask.id ? { ...st, title: e.target.value } : st
                              );
                              setFormData({ ...formData, subtasks: updated });
                            }}
                            className="flex-1 h-8 text-sm"
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                            setFormData({
                              ...formData,
                              subtasks: formData.subtasks.filter(st => st.id !== subtask.id)
                            });
                          }}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500" onClick={handleCreateTask} disabled={isSubmitting}>Publicar</Button>
                      <Button variant="outline" className="flex-1" disabled={isSubmitting} onClick={async () => {
                        setIsSubmitting(true);
                        try {
                          const newTask = buildTask({
                            title: formData.title,
                            description: formData.description || undefined,
                            priority: formData.priority,
                            energyLevel: formData.energyLevel,
                            dueDate: formData.dueDate || undefined,
                            categoryId: formData.categoryId || undefined,
                            tags: formData.tags,
                            recurring: formData.recurring,
                            subtasks: formData.subtasks,
                            reminders: formData.reminders,
                          }, 'open');

                          if (database && user) {
                            try {
                              const tasksRef = ref(database, `users/${user.uid}/tasks/${newTask.id}`);
                              await set(tasksRef, newTask);
                            } catch {
                              toast({ title: 'Erro', description: 'Falha ao salvar tarefa no servidor', variant: 'destructive' });
                              return;
                            }
                          } else {
                            setTasks(addTaskToStorage(newTask));
                          }
                          toast({ title: 'Rascunho salvo', description: 'Tarefa salva como rascunho' });
                          setIsCreateOpen(false);
                          setFormData({ title: '', description: '', priority: 'medium', energyLevel: 3, dueDate: '', categoryId: null, tags: [], recurring: 'none', subtasks: [], reminders: [] });
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}>Rascunho</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="px-2 md:px-3 py-3 md:py-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 md:mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <TabsTrigger value="tarefas" className="text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-md transition-all">
              <List className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Tarefas</span>
            </TabsTrigger>
            <TabsTrigger value="kanban" className="text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-md transition-all">
              <LayoutGrid className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Kanban</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tarefas" className="space-y-0">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-4 mb-6" role="region" aria-label="Estatísticas">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-3 pb-3">
                  <p className="text-xs md:text-sm text-slate-500">📅 Para Hoje</p>
                  <p className="text-xl md:text-2xl font-bold">{stats.today}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="pt-3 pb-3">
                  <p className="text-xs md:text-sm text-slate-500">Pendentes</p>
                  <p className="text-xl md:text-2xl font-bold">{stats.pending}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="pt-3 pb-3">
                  <p className="text-xs md:text-sm text-slate-500">🔥 Sequência</p>
                  <p className="text-xl md:text-2xl font-bold">{stats.streak} dias</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="pt-3 pb-3">
                  <p className="text-xs md:text-sm text-slate-500">🏆 Conquistas</p>
                  <p className="text-xl md:text-2xl font-bold">{unlockedAchievements}/{achievements.length}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-emerald-500">
                <CardContent className="pt-3 pb-3">
                  <p className="text-xs md:text-sm text-slate-500">Concluídas</p>
                  <p className="text-xl md:text-2xl font-bold">{stats.completed}</p>
                </CardContent>
              </Card>
            </div>

        {tasks.filter(t => t.dueDate && t.status !== 'completed').length > 0 && (
          <Card className="mb-4 md:mb-6">
            <CardHeader className="py-2 px-3 md:py-3 md:px-4">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Calendário
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 md:px-4 md:pb-4">
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(
                  tasks
                    .filter(t => t.dueDate && t.status !== 'completed')
                    .map(t => {
                      const d = new Date(t.dueDate!);
                      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                    })
                )).map(dateKey => {
                  const [year, month, day] = dateKey.split('-').map(Number);
                  const date = new Date(year, month, day);
                  const dayTasks = tasks.filter(t => {
                    if (!t.dueDate || t.status === 'completed') return false;
                    const d = new Date(t.dueDate);
                    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
                  });
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isPast = date < new Date(new Date().setHours(0,0,0,0));
                  
                  return (
                    <Button
                      key={dateKey}
                      variant={isToday ? "default" : "outline"}
                      size="sm"
                      className={`flex flex-col items-center min-w-[60px] h-auto py-2 ${
                        isToday 
                          ? '' 
                          : 'bg-blue-300 hover:bg-blue-400 dark:bg-blue-700 dark:hover:bg-blue-600 border-blue-400 dark:border-blue-500 text-blue-900 dark:text-blue-100'
                      }`}
                      onClick={() => {
                        const [year, month, day] = dateKey.split('-');
                        const targetDate = `${year}-${month}-${day}`;
                        const element = document.getElementById(`task-date-${targetDate}`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                    >
                      <span className={`text-xs ${isToday ? 'text-white' : 'text-blue-800 dark:text-blue-200'} opacity-70`}>
                        {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </span>
                      <span className={`text-lg font-bold ${isToday ? 'text-white' : 'text-blue-900 dark:text-blue-100'}`}>{date.getDate()}</span>
                      <span className={`text-xs ${isToday ? 'text-white' : 'text-blue-700 dark:text-blue-300'}`}>{dayTasks.length} {dayTasks.length === 1 ? 'tarefa' : 'tarefas'}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input placeholder="Buscar tarefas..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10" aria-label="Buscar tarefas" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32 md:w-40 h-10" aria-label="Filtrar por status">
              <Filter className="w-4 h-4 mr-2" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="in_progress">Em Progresso</SelectItem>
              <SelectItem value="completed">Concluídas</SelectItem>
              <SelectItem value="archived">Arquivadas ({stats.archived})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 md:space-y-6">
          {tasksByEnergy.map(({ level, tasks: levelTasks }) => (
            levelTasks.length > 0 ? (
            <motion.div key={level} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: level * 0.1 }}>
              <Card className="overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${energyConfig[level].color}`} />
                <CardHeader className="py-2 px-3 md:py-3 md:px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm md:text-base flex items-center gap-2">
                      <span className="text-lg md:text-xl">{energyConfig[level].emoji}</span>
                      {energyConfig[level].label}
                      <Badge variant="outline" className="ml-1 md:ml-2 text-xs">{levelTasks.length}</Badge>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-320px)] md:h-[calc(100vh-380px)] max-h-80 md:max-h-96 min-h-[100px] md:min-h-[120px]">
                      <div className="divide-y" role="list" aria-label={`Tarefas ${energyConfig[level].label}`}>
                        {levelTasks.map((task) => (
                          <div 
                            key={task.id} 
                            id={task.dueDate ? `task-date-${task.dueDate.slice(0,10)}` : undefined}
                            className="p-3 md:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer active:bg-slate-100"
                            role="listitem"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setEditingTask(task);
                              }
                            }}
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('button')) return;
                              setEditingTask(task);
                            }}
                          >
                              <div className="flex items-start gap-2 md:gap-3">
                              <Button variant="ghost" size="icon" className="mt-0.5 h-5 w-5 rounded-full border-2 hover:bg-emerald-50 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCompleteTask(task);
                                }}
                                aria-label="Concluir tarefa" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 md:gap-2 mb-1 flex-wrap">
                                  <h4 className="font-medium text-sm md:text-base truncate">{task.title}</h4>
                                  <Badge variant="secondary" className={`text-[10px] md:text-xs ${priorityConfig[task.priority].textColor}`}>
                                    {priorityConfig[task.priority].label}
                                  </Badge>
                                  {task.categoryId && categoryConfig[task.categoryId as keyof typeof categoryConfig] && (
                                    <Badge 
                                      variant="outline" 
                                      className="text-[10px] md:text-xs"
                                      style={{ borderColor: categories.find(c => c.id === task.categoryId)?.color, color: categories.find(c => c.id === task.categoryId)?.color }}
                                    >
                                      {(() => {
                                        const CatIcon = categoryConfig[task.categoryId as keyof typeof categoryConfig]?.icon;
                                        return CatIcon ? <CatIcon className="w-3 h-3 mr-0.5" /> : null;
                                      })()}
                                      <span className="hidden md:inline">{categoryConfig[task.categoryId as keyof typeof categoryConfig]?.label}</span>
                                    </Badge>
                                  )}
                                  {task.recurring && task.recurring !== 'none' && (
                                    <Badge variant="outline" className="text-[10px] md:text-xs text-indigo-500 border-indigo-200">
                                      <RotateCw className="w-3 h-3 mr-0.5" />
                                      <span className="hidden md:inline">{task.recurring === 'daily' ? 'Diário' : task.recurring === 'weekly' ? 'Semanal' : 'Mensal'}</span>
                                    </Badge>
                                  )}
                                </div>
                                {task.tags && task.tags.length > 0 && (
                                  <div className="flex items-center gap-1 mb-1">
                                    {task.tags.map(tagId => {
                                      const tag = tags.find(t => t.id === tagId);
                                      return tag ? (
                                        <span key={tagId} className="text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: tag.color }}>
                                          {tag.name}
                                        </span>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                                {task.subtasks && task.subtasks.length > 0 && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-emerald-500 transition-all"
                                        style={{ width: `${(task.subtasks.filter(st => st.completed).length / task.subtasks.length) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-slate-500">
                                      {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
                                    </span>
                                  </div>
                                )}
                                {task.description && (
                                  <p className="text-xs md:text-sm text-slate-500 line-clamp-1">{task.description}</p>
                                )}
                                {task.dueDate && (
                                  <p className="text-[10px] md:text-xs text-slate-400 mt-1 flex items-center gap-1">
                                    <CalendarIcon className="w-3 h-3" />
                                    {formatLocalDate(task.dueDate)}
                                  </p>
                                )}
                              </div>
                              {speechSynthesisSupported && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-blue-500 hover:text-blue-600" 
                                  onClick={() => handleReadTask(task)}
                                  title={readingTaskId === task.id ? "Parar leitura" : "Ler tarefa"}
                                >
                                  {readingTaskId === task.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Volume2 className="w-4 h-4" />
                                  )}
                                </Button>
                              )}

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais opções">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditingTask(task)}>
                                    <EyeIcon className="w-4 h-4 mr-2" /> Ver detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCompleteTask(task)}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Concluir
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateTaskDirect(task.id, { status: 'in_progress' })}>
                                    <TrendingUp className="w-4 h-4 mr-2" /> Em progresso
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleArchiveTask(task.id)}>
                                    <Archive className="w-4 h-4 mr-2" /> Arquivar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteTask(task.id)}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
            ) : null
          ))}
        </div>

        {statusFilter === 'all' && filteredTasks.filter(t => t.status === 'completed').length > 0 && (
          <div className="mt-8">
            <Separator className="mb-4" />
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h2 className="text-lg font-semibold">Concluídas</h2>
            </div>
            <div className="grid gap-2">
              {filteredTasks.filter(t => t.status === 'completed').slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-slate-500 line-through">{task.title}</span>
                  <Badge variant="outline" className="ml-auto">+{task.points} pts</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
          </TabsContent>

          <TabsContent value="kanban" className="space-y-0">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="mt-4 md:mt-6">
              <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
                Quadro Kanban
              </h2>
              <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
                <div className="flex gap-2 md:grid md:grid-cols-5 md:gap-3 min-w-[600px] md:min-w-0 pb-4 md:pb-0" role="region" aria-label="Quadro Kanban">
                  {kanbanColumns.map(column => {
                    const ColumnIcon = column.icon;
                    const columnTasks = filteredTasks.filter(t => t.status === column.id);
                    const columnTasksText = columnTasks.map(t => t.title).join(', ');
                    return (
                      <Card key={column.id} className={`border-l-4 ${column.color} min-w-[140px] md:min-w-0 flex-shrink-0`}>
                        <CardHeader className={`py-1.5 px-2 ${column.bgColor}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <ColumnIcon className={`w-3 h-3 ${column.textColor}`} />
                              <h3 className={`font-semibold text-[10px] ${column.textColor}`}>{column.label}</h3>
                            </div>
                            <Badge variant="outline" className={`text-[10px] ${column.textColor} px-1`}>{columnTasks.length}</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 text-[9px] w-full justify-center text-slate-500 hover:text-blue-600"
                            onClick={() => {
                              if (columnTasks.length > 0) {
                                speak(`${column.label}: ${columnTasksText}`);
                              } else {
                                speak(`Nenhuma tarefa em ${column.label}`);
                              }
                            }}
                          >
                            <Volume2 className="w-2.5 h-2.5 mr-1" />
                            Ler
                          </Button>
                        </CardHeader>
                        <CardContent className="p-1.5">
                          <DroppableZone id={column.id}>
                            {(isOver) => (
                              <DroppableColumn columnId={column.id} isOver={isOver}>
                                <ScrollArea className="h-[calc(100vh-420px)] md:h-[calc(100vh-400px)]">
                                  <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-1.5 min-h-[60px]">
                                      {columnTasks.map(task => (
                                        <SortableTask key={task.id} task={task} onClick={() => setEditingTask(task)} categories={categories} />
                                      ))}
                                      {columnTasks.length === 0 && (
                                        <div className={`text-center py-3 text-slate-400 text-[9px] border-2 border-dashed rounded-lg transition-colors ${isOver ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                          {isOver ? 'Solte aqui!' : 'Arraste aqui'}
                                        </div>
                                      )}
                                    </div>
                                  </SortableContext>
                                </ScrollArea>
                              </DroppableColumn>
                            )}
                          </DroppableZone>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
            <DragOverlay>
              {activeTask ? (
                <Card className="p-3 shadow-xl opacity-90 rotate-3">
                  <h4 className="font-medium text-sm">{activeTask.title}</h4>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showAchievements} onOpenChange={setShowAchievements}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Conquistas
            </DialogTitle>
            <DialogDescription>
              {unlockedAchievements} de {achievements.length} conquistas desbloqueadas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-3 rounded-lg border ${achievement.unlocked ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${achievement.unlocked ? 'bg-yellow-100' : 'bg-slate-100'}`}>
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{achievement.name}</h4>
                    <p className="text-xs text-slate-500">{achievement.description}</p>
                  </div>
                  {achievement.unlocked && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                      ✅
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Detalhes da Tarefa</DialogTitle></DialogHeader>
          {editingTask && (
            <div className="space-y-4 pt-4">
              <div>
                <Label>Título</Label>
                <Input value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })} rows={3} />
              </div>
              {editingTask.subtasks && editingTask.subtasks.length > 0 && (
                <div>
                  <Label>Subtarefas</Label>
                  <div className="space-y-2 mt-2">
                    {editingTask.subtasks.map(subtask => (
                      <div key={subtask.id} className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleToggleSubtask(editingTask.id, subtask.id)}
                          aria-label={subtask.completed ? `Marcar "${subtask.title}" como pendente` : `Marcar "${subtask.title}" como concluída`}
                        >
                          {subtask.completed ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </Button>
                        <span className={subtask.completed ? 'line-through text-slate-400' : ''}>{subtask.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={editingTask.status}
                    onValueChange={(v) => setEditingTask({ ...editingTask, status: v as Task['status'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="in_progress">Em Processo</SelectItem>
                      <SelectItem value="review">Revisão</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="archived">Arquivado</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Select value={editingTask.priority}
                    onValueChange={(v) => setEditingTask({ ...editingTask, priority: v as Task['priority'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => handleUpdateTask(editingTask.id, editingTask)}>
                  Salvar
                </Button>
                <Button variant="outline" onClick={() => { handleArchiveTask(editingTask.id); setEditingTask(null); }}>
                  <Archive className="w-4 h-4 mr-2" /> Arquivar
                </Button>
                <Button variant="destructive" onClick={() => { handleDeleteTask(editingTask.id); setEditingTask(null); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TaskAlert
        task={activeAlert}
        onDismiss={dismissAlert}
        onComplete={(taskId) => handleUpdateTask(taskId, { status: 'completed' })}
      />

      <Dialog open={isVoiceCreateOpen} onOpenChange={setIsVoiceCreateOpen}>
        <DialogContent className="w-[calc(100%-16px)] max-w-lg max-h-[85vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-purple-600" />
              Criar Tarefa por Voz
            </DialogTitle>
            <DialogDescription>
              Use o microfone para ditear o título e a descrição da tarefa.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div>
              <Label className="flex items-center justify-between">
                Título *
                <Button
                  size="sm"
                  variant={isListeningTitle ? "destructive" : "outline"}
                  onClick={isListeningTitle ? handleStopListeningTitle : handleStartListeningTitle}
                  className={isListeningTitle ? "animate-pulse" : ""}
                >
                  {isListeningTitle ? (
                    <><MicOff className="w-4 h-4 mr-1" /> Parar</>
                  ) : (
                    <><Mic className="w-4 h-4 mr-1" /> Falar</>
                  )}
                </Button>
              </Label>
              <Input 
                placeholder="Digite ou fale o título..." 
                value={voiceTitle}
                onChange={(e) => setVoiceTitle(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="flex items-center justify-between">
                Descrição
                <Button
                  size="sm"
                  variant={isListeningDescription ? "destructive" : "outline"}
                  onClick={isListeningDescription ? handleStopListeningDescription : handleStartListeningDescription}
                  className={isListeningDescription ? "animate-pulse" : ""}
                >
                  {isListeningDescription ? (
                    <><MicOff className="w-4 h-4 mr-1" /> Parar</>
                  ) : (
                    <><Mic className="w-4 h-4 mr-1" /> Falar</>
                  )}
                </Button>
              </Label>
              <Textarea 
                placeholder="Digite ou fale a descrição..." 
                value={voiceDescription}
                onChange={(e) => setVoiceDescription(e.target.value)}
                rows={3} 
                className="mt-1"
              />
            </div>

            {(isListeningTitle || isListeningDescription) && (
              <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4 text-center" role="status" aria-live="polite">
                <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
                  <Mic className="w-5 h-5 animate-pulse" />
                  <span className="font-medium">Ouvindo...</span>
                </div>
                {transcript && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">"{transcript}"</p>
                )}
              </div>
            )}

            {speechError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400" role="alert" aria-live="assertive">
                <div className="flex items-start justify-between gap-2">
                  <span>
                    {speechError === 'not-allowed' && 'Permissão de microfone negada. Permita o acesso nas configurações do navegador.'}
                    {speechError === 'no-speech' && 'Nenhuma fala detectada. Tente novamente.'}
                    {speechError === 'network' && 'Erro de rede. Verifique sua conexão.'}
                    {speechError === 'aborted' && 'Reconhecimento interrompido.'}
                    {speechError === 'audio-capture' && 'Nenhum microfone encontrado.'}
                    {speechError === 'service-not-allowed' && 'Serviço de reconhecimento não disponível neste navegador.'}
                    {speechError === 'language-not-supported' && 'Idioma não suportado para reconhecimento de voz.'}
                    {!['not-allowed', 'no-speech', 'network', 'aborted', 'audio-capture', 'service-not-allowed', 'language-not-supported'].includes(speechError) && `Erro: ${speechError}`}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => { stopListening(); clearError(); handleStartListeningTitle(); }} className="h-6 px-2 text-xs">
                      <RefreshCw className="w-3 h-3 mr-1" /> Tentar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => clearError()} className="h-6 px-2 text-xs">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label>Categoria</Label>
              <div className="flex gap-2 mt-2">
                {categories.map((cat) => {
                  const config = categoryConfig[cat.id as keyof typeof categoryConfig];
                  const Icon = config?.icon;
                  return (
                    <Button
                      key={cat.id}
                      type="button"
                      variant={formData.categoryId === cat.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormData({ ...formData, categoryId: cat.id })}
                      className={`flex-1 gap-1 ${formData.categoryId === cat.id ? config?.bgLight : ''}`}
                      style={formData.categoryId === cat.id ? { 
                        backgroundColor: cat.color + '20', 
                        borderColor: cat.color,
                        color: cat.color
                      } : {}}
                    >
                      {Icon && <Icon className="w-4 h-4" />}
                      {cat.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prioridade</Label>
                <Select value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v as Task['priority'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">😌 Baixa</SelectItem>
                    <SelectItem value="medium">😊 Média</SelectItem>
                    <SelectItem value="high">🔥 Alta</SelectItem>
                    <SelectItem value="urgent">⚡ Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Energia</Label>
                <Select value={String(formData.energyLevel)}
                  onValueChange={(v) => setFormData({ ...formData, energyLevel: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">😌 Muito Baixa</SelectItem>
                    <SelectItem value="2">🙂 Baixa</SelectItem>
                    <SelectItem value="3">😊 Média</SelectItem>
                    <SelectItem value="4">🔥 Alta</SelectItem>
                    <SelectItem value="5">⚡ Muito Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Data de Vencimento</Label>
              <Suspense fallback={<div className="h-10 w-full border rounded-md bg-muted animate-pulse" />}>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal mt-2 ${!formData.dueDate && 'text-muted-foreground'}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dueDate ? (
                      (() => {
                        const [datePart, timePart] = formData.dueDate.split('T');
                        const [year, month, day] = datePart.split('-');
                        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        return date.toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        }) + ' ' + (timePart || '09:00');
                      })()
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate ? (() => {
                      const [datePart] = formData.dueDate.split('T');
                      const [year, month, day] = datePart.split('-');
                      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    })() : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const currentParts = formData.dueDate ? formData.dueDate.split('T') : null;
                        const currentTime = currentParts && currentParts[1] ? currentParts[1] : '09:00';
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const localDateStr = `${year}-${month}-${day}T${currentTime}`;
                        setFormData({ ...formData, dueDate: localDateStr });
                      }
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                  />
                  <div className="p-3 border-t">
                    <Label className="text-xs text-muted-foreground">Horário</Label>
                    <Input 
                      type="time"
                      value={formData.dueDate ? formData.dueDate.split('T')[1] || '09:00' : '09:00'}
                      onChange={(e) => {
                        if (formData.dueDate) {
                          const [year, month, day] = formData.dueDate.split('T')[0].split('-');
                          const localDateStr = `${year}-${month}-${day}T${e.target.value}`;
                          setFormData({ ...formData, dueDate: localDateStr });
                        }
                      }}
                      className="mt-1"
                    />
                  </div>
                </PopoverContent>
              </Popover>
              </Suspense>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Recorrência</Label>
                <Select value={formData.recurring || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, recurring: v as Task['recurring'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não</SelectItem>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Energia</Label>
                <Select value={String(formData.energyLevel)}
                  onValueChange={(v) => setFormData({ ...formData, energyLevel: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">😌</SelectItem>
                    <SelectItem value="2">🙂</SelectItem>
                    <SelectItem value="3">😊</SelectItem>
                    <SelectItem value="4">🔥</SelectItem>
                    <SelectItem value="5">⚡</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500" 
              onClick={handleConfirmVoiceCreate}
              disabled={!voiceTitle.trim()}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Criar Tarefa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <footer className="border-t mt-auto py-4 bg-white/50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          <p>Nexus - Organize suas tarefas</p>
        </div>
      </footer>
    </div>
  );
}

'use client';

import { useState, useEffect, lazy, Suspense, useMemo, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { 
  Plus, Zap, Trash2, CheckCircle2, Clock,
  Target, TrendingUp, Calendar as CalendarIcon, Search, Filter,
  Bell,
  Mic, Volume2, Loader2, Briefcase,
  User, BookOpen, X, Trophy, Timer, LayoutGrid, List,
  Pencil,
  Archive, RotateCw, Minus, GripVertical,
  CircleDot, Clock3, Eye as EyeIcon, CheckCheck, MoreHorizontal,
  MicOff, Square, CheckSquare, RefreshCw, WifiOff
} from 'lucide-react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis';
import { loadTasksFromStorage, saveTasksToStorage, addTaskToStorage, updateTaskInStorage, removeTaskFromStorage } from '@/lib/task-helpers';
import { useStats } from '@/hooks/use-stats';
import { useFilteredTasks, type PriorityFilter, type DueFilter } from '@/hooks/use-filtered-tasks';
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
import { ToastAction } from '@/components/ui/toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ClockWidget, WeatherWidget } from '@/components/widgets';
import { ProfileCard } from '@/components/profile-card';
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

const EditableTitle = memo(function EditableTitle({
  task,
  onRename,
}: {
  task: Task;
  onRename: (id: string, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(task.title);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing, task.title]);

  const commit = () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== task.title) {
      onRename(task.id, trimmed);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-full min-w-0 rounded-md border border-purple-400 bg-transparent px-1.5 py-0.5 text-sm md:text-base font-medium text-slate-900 dark:text-white outline-none ring-2 ring-purple-500/40"
        aria-label="Editar título da tarefa"
      />
    );
  }

  return (
    <div className="flex items-center gap-1 min-w-0">
      <h4 className="font-medium text-sm md:text-base truncate min-w-0">
        {task.title}
      </h4>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        className="text-slate-400 hover:text-purple-500 active:scale-90 transition-all shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        aria-label={`Renomear tarefa ${task.title}`}
        title="Renomear"
      >
        <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
});

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
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [activeTab, setActiveTab] = useState<'tarefas' | 'kanban'>('tarefas');
  const [activeTask, setActiveTask] = useState<Task | null | undefined>(undefined);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isVoiceCreateOpen, setIsVoiceCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null | undefined>(undefined);
  const [showAchievements, setShowAchievements] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
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

  // Monitorar conexão
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
    const previous = tasks.find(t => t.id === task.id);

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
      await persistTaskUpdate(task.id, updates);
      toast({
        title: 'Tarefa concluída! 🎉',
        description: `"${task.title}" concluída${task.points ? ` (+${task.points} pts)` : ''}`,
        action: (
          <ToastAction altText="Desfazer conclusão" onClick={() => restoreTaskStatus(task, previous)}>
            Desfazer
          </ToastAction>
        ),
      });
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    handleUpdateTaskDirect(id, updates);
    setEditingTask(null);
  };

  const persistTaskUpdate = async (id: string, updates: Partial<Task>): Promise<boolean> => {
    if (database && user) {
      try {
        const taskRef = ref(database, `users/${user.uid}/tasks/${id}`);
        await update(taskRef, updates);
        return true;
      } catch {
        toast({ title: 'Erro', description: 'Falha ao atualizar tarefa no servidor', variant: 'destructive' });
        return false;
      }
    } else {
      setTasks(updateTaskInStorage(id, updates));
      return true;
    }
  };

  const handleUpdateTaskDirect = async (id: string, updates: Partial<Task>) => {
    await persistTaskUpdate(id, updates);
    toast({ title: 'Sucesso', description: 'Tarefa atualizada!' });
  };

  const restoreTaskStatus = async (task: Task, previous?: Task) => {
    const prevSnapshot: Partial<Task> = previous
      ? { status: previous.status, completedAt: previous.completedAt ?? null, archivedAt: previous.archivedAt ?? null }
      : { status: 'pending', completedAt: null };
    const ok = await persistTaskUpdate(task.id, prevSnapshot);
    if (ok) {
      toast({ title: 'Desfeito', description: `"${task.title}" voltou para o estado anterior` });
    }
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
    const deletedTask = tasks.find(t => t.id === id);
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
    toast({
      title: 'Tarefa excluída!',
      description: deletedTask ? `"${deletedTask.title}" foi removida` : undefined,
      action: deletedTask ? (
        <ToastAction altText="Restaurar tarefa" onClick={() => restoreDeletedTask(deletedTask)}>
          Restaurar
        </ToastAction>
      ) : undefined,
    });
  };

  const restoreDeletedTask = async (task: Task) => {
    if (database && user) {
      try {
        const taskRef = ref(database, `users/${user.uid}/tasks/${task.id}`);
        await set(taskRef, task);
      } catch {
        toast({ title: 'Erro', description: 'Falha ao restaurar tarefa no servidor', variant: 'destructive' });
        return;
      }
    } else {
      const existing = loadTasksFromStorage();
      const updated = [task, ...existing];
      saveTasksToStorage(updated);
      setTasks(updated);
    }
    toast({ title: 'Restaurada!', description: `"${task.title}" voltou para sua lista` });
  };

  const unlockedAchievements = achievements.filter(a => a.unlocked).length;
  const { filteredTasks, tasksByEnergy } = useFilteredTasks(tasks, debouncedSearch, statusFilter, priorityFilter, dueFilter);

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
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="aurora-blob aurora-a absolute -top-56 -left-40 h-[32rem] w-[32rem] rounded-full bg-gradient-to-br from-purple-400/40 to-pink-400/30 blur-[90px]" />
        <div className="aurora-blob aurora-b absolute top-1/4 -right-48 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-blue-400/40 to-cyan-400/30 blur-[90px]" />
        <div className="aurora-blob aurora-c absolute -bottom-56 left-1/4 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-fuchsia-400/25 to-indigo-400/25 blur-[100px]" />
      </div>
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md safe-area-inset-top">
        <div className="px-2 py-2 md:px-3 md:py-3">
          <div className="flex flex-wrap items-center justify-between gap-x-1 gap-y-2 md:gap-x-2">
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
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

              <div className="shrink-0 min-w-0">
                <ProfileCard displayName={displayName} email={user?.email || null} setDisplayName={setDisplayName} />
              </div>

            <div className="flex-1 flex items-center justify-center gap-1 md:gap-2.5 flex-wrap min-w-0">
              {!isOnline && (
                <Badge
                  variant="outline"
                  role="status"
                  aria-label="Modo offline"
                  className="gap-1.5 px-2 py-1 text-xs border-amber-400/60 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30"
                >
                  <WifiOff className="w-3 h-3" aria-hidden="true" />
                  <span className="hidden sm:inline">Offline</span>
                </Badge>
              )}
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

              <div className="flex flex-col gap-1.5">
                <div className="flex flex-row gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (pomodoroActive) {
                        setPomodoroActive(false);
                      } else {
                        setPomodoroTime(25 * 60);
                        setPomodoroActive(true);
                        setPomodoroSession('work');
                      }
                    }}
                    title={pomodoroActive ? 'Pausar pomodoro' : 'Iniciar pomodoro (25 min)'}
                    aria-label={pomodoroActive ? 'Pausar pomodoro' : 'Iniciar pomodoro'}
                    className={`w-8 h-8 md:w-10 md:h-10 outline-none border-none bg-white dark:bg-slate-800 rounded-[2.25rem_0.25rem_0.25rem_0.25rem] shadow-lg transition-all duration-200 ease-in-out group flex items-center justify-center ${pomodoroActive ? 'bg-red-500 hover:bg-red-600' : 'hover:scale-110 hover:bg-[#03A9F4]'}`}
                  >
                    <Timer className={`w-4 h-4 transition-colors duration-200 ${pomodoroActive ? 'text-white' : 'text-[#03A9F4] group-hover:fill-white group-hover:text-white'}`} />
                  </button>

                  <button
                    type="button"
                    onClick={requestNotificationPermission}
                    title="Ativar notificações"
                    aria-label="Ativar notificações"
                    className="w-8 h-8 md:w-10 md:h-10 outline-none border-none bg-white dark:bg-slate-800 rounded-[0.25rem_2.25rem_0.25rem_0.25rem] shadow-lg transition-all duration-200 ease-in-out hover:scale-110 hover:bg-[#cc39a4] group flex items-center justify-center"
                  >
                    <Bell className="w-4 h-4 text-[#cc39a4] group-hover:fill-white group-hover:text-white transition-colors duration-200" />
                  </button>
                </div>

                <div className="flex flex-row gap-1.5">
                  {speechRecognitionSupported && (
                  <button
                    type="button"
                    onClick={handleVoiceCreate}
                    title="Criar tarefa por voz"
                    aria-label="Criar tarefa por voz"
                    className="w-8 h-8 md:w-10 md:h-10 outline-none border-none bg-white dark:bg-slate-800 rounded-[0.25rem_0.25rem_0.25rem_2.25rem] shadow-lg transition-all duration-200 ease-in-out hover:scale-110 hover:bg-black group flex items-center justify-center"
                  >
                    <Mic className="w-4 h-4 text-black dark:text-white group-hover:fill-white group-hover:text-white transition-colors duration-200" />
                  </button>
                )}

                  <button
                    type="button"
                    onClick={() => setShowAchievements(true)}
                    title="Conquistas"
                    aria-label={`Conquistas: ${unlockedAchievements} desbloqueadas`}
                    className="relative w-8 h-8 md:w-10 md:h-10 outline-none border-none bg-white dark:bg-slate-800 rounded-[0.25rem_0.25rem_2.25rem_0.25rem] shadow-lg transition-all duration-200 ease-in-out hover:scale-110 hover:bg-[#8c9eff] group flex items-center justify-center"
                  >
                    <Trophy className="w-4 h-4 text-[#8c9eff] group-hover:fill-white group-hover:text-white transition-colors duration-200" />
                    {unlockedAchievements > 0 && (
                      <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center" aria-hidden="true">
                        {unlockedAchievements}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
                <Zap className="w-3 h-3 text-yellow-500" aria-hidden="true" />
                <span className="font-semibold hidden sm:inline">{stats.points} pts</span>
              </Badge>

              <div
                  className="group w-16 aspect-video rounded-lg has-[:checked]:bg-[#3a3347] bg-[#ebe6ef] border-4 border-[#121331] overflow-hidden focus-within:ring-2 focus-within:ring-purple-500"
                  title={theme === 'light' ? 'Alternar para tema escuro' : 'Alternar para tema claro'}
                >
                  <div className="relative flex h-full w-full px-1 items-center gap-x-1">
                    <div className="w-2 h-2 flex-shrink-0 rounded-full border-4 border-[#121331]" />
                    <label
                      htmlFor="theme-switch"
                      className="relative h-full flex-1 cursor-pointer"
                      aria-label={theme === 'light' ? 'Alternar para tema escuro' : 'Alternar para tema claro'}
                    >
                      <input
                        type="checkbox"
                        id="theme-switch"
                        className="sr-only"
                        checked={theme === 'dark'}
                        onChange={toggleTheme}
                      />
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 transition-transform duration-300 ease-out group-has-[:checked]:translate-x-[20px]"
                        aria-hidden="true"
                      >
                        <div className="relative">
                          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[8px] border-t-[#121331] -mb-px" />
                          <div className="w-[18px] h-[12px] bg-[#f24c00] border-2 border-[#121331] rounded-[3px] relative">
                            <div className="absolute -top-[3px] -left-[2px] w-[8px] h-[6px] bg-[#e44901] rounded-sm border border-[#121331]/50" />
                          </div>
                        </div>
                      </div>
                    </label>
                    <div className="w-3 h-0.5 flex-shrink-0 bg-[#121331] rounded-full" />
                  </div>
                </div>

              <button
                type="button"
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
                className="group flex items-center justify-start w-11 h-11 bg-gradient-to-br from-red-500 to-rose-600 rounded-full cursor-pointer relative overflow-hidden transition-all duration-200 shadow-lg shadow-red-500/30 hover:w-32 hover:rounded-lg hover:shadow-red-500/50 active:translate-x-1 active:translate-y-1"
              >
                <div className="flex items-center justify-center w-full transition-all duration-300 group-hover:justify-start group-hover:px-3">
                  <svg className="w-4 h-4" viewBox="0 0 512 512" fill="white" aria-hidden="true">
                    <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" />
                  </svg>
                </div>
                <div className="absolute right-5 transform translate-x-full opacity-0 text-white text-lg font-semibold transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                  Logout
                </div>
              </button>

              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="cursor-pointer uppercase glass-card text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-md active:translate-x-0.5 active:translate-y-0.5 hover:shadow-[0.5rem_0.5rem_#F44336,-0.5rem_-0.5rem_#00BCD4] transition flex items-center gap-1 md:gap-2"
                    aria-label="Criar nova tarefa"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nova</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100%-16px)] max-w-lg max-h-[85vh] overflow-hidden bg-white dark:bg-slate-900 border-0 rounded-md shadow-xl p-0 [&_[data-slot='dialog-close']]:text-slate-500 [&_[data-slot='dialog-close']]:dark:text-slate-400 [&_[data-slot='dialog-close']]:opacity-80 [&_[data-slot='dialog-close']]:top-2 [&_[data-slot='dialog-close']]:right-2">
                  <div className="relative h-full">
                  <p
                    className="text-purple-500/50 dark:text-purple-400/40 translate-x-[46%] -rotate-90 tracking-[20px] hover:translate-x-[50%] -translate-y-1/2 font-semibold text-2xl absolute right-0 top-1/2 pointer-events-none select-none"
                    aria-hidden="true"
                  >
                    Nova
                  </p>
                  <div className="capitalize overflow-y-auto max-h-[85vh] py-5 px-6 flex flex-col gap-3">
                    <div>
                      <DialogTitle className="text-2xl text-slate-900 dark:text-white pb-1 leading-tight">Criar Nova Tarefa</DialogTitle>
                      <DialogDescription className="text-sm text-purple-600 dark:text-purple-300">Adicione uma nova tarefa</DialogDescription>
                    </div>
                    <div className="flex flex-col gap-4">
                    <div>
                      <Label className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Título *</Label>
                      <Input placeholder="Ex: Reunião com cliente" value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full py-px pl-0 bg-transparent outline-none focus:ring-0 border-0 border-b-2 border-purple-400 dark:border-purple-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-xs rounded-none shadow-none" />
                    </div>
                    <div>
                      <Label className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Descrição</Label>
                      <Textarea placeholder="Detalhes..." value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2}
                        className="w-full py-px pl-0 bg-transparent outline-none focus:ring-0 border-0 border-b-2 border-purple-400 dark:border-purple-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-xs rounded-none shadow-none resize-none" />
                    </div>
                    
                    <div>
                      <Label className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Categoria</Label>
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
                              className={`flex-1 gap-1 ${
                                formData.categoryId === cat.id
                                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent hover:from-purple-500 hover:to-pink-500'
                                  : 'bg-transparent border-purple-400 dark:border-purple-500/60 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                              }`}
                              style={formData.categoryId === cat.id ? { 
                                backgroundColor: cat.color + '20', 
                                borderColor: cat.color,
                                color: cat.color,
                                backgroundImage: 'none'
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
                        <Label className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Prioridade</Label>
                        <Select value={formData.priority}
                          onValueChange={(v) => setFormData({ ...formData, priority: v as Task['priority'] })}>
                          <SelectTrigger className="w-full py-px pl-0 bg-transparent outline-none focus:ring-0 border-0 border-b-2 border-purple-400 dark:border-purple-500 focus:outline-none text-slate-800 dark:text-slate-100 rounded-none shadow-none [&_svg]:text-purple-500 dark:[&_svg]:text-purple-400 data-[placeholder]:text-slate-400 dark:data-[placeholder]:text-slate-500"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">😌 Baixa</SelectItem>
                            <SelectItem value="medium">😊 Média</SelectItem>
                            <SelectItem value="high">🔥 Alta</SelectItem>
                            <SelectItem value="urgent">⚡ Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Energia</Label>
                        <Select value={String(formData.energyLevel)}
                          onValueChange={(v) => setFormData({ ...formData, energyLevel: Number(v) })}>
                          <SelectTrigger className="w-full py-px pl-0 bg-transparent outline-none focus:ring-0 border-0 border-b-2 border-purple-400 dark:border-purple-500 focus:outline-none text-slate-800 dark:text-slate-100 rounded-none shadow-none [&_svg]:text-purple-500 dark:[&_svg]:text-purple-400 data-[placeholder]:text-slate-400 dark:data-[placeholder]:text-slate-500"><SelectValue /></SelectTrigger>
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
                      <Label className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Data de Vencimento</Label>
                      <Suspense fallback={<div className="h-10 w-full rounded-md bg-purple-100 dark:bg-purple-900/30 animate-pulse" />}>
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal mt-2 rounded-none border-0 border-b-2 border-purple-400 dark:border-purple-500 bg-transparent text-slate-800 dark:text-slate-100 shadow-none hover:bg-purple-50 dark:hover:bg-purple-900/30 ${!formData.dueDate && 'text-slate-400 dark:text-slate-500'}`}
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
                        <Label className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Lembretes</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {reminderOptions.map(option => (
                            <Button
                              key={option.value}
                              type="button"
                              size="sm"
                              variant={formData.reminders.includes(option.value) ? "default" : "outline"}
                              className={`text-xs ${
                                formData.reminders.includes(option.value)
                                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent hover:from-purple-500 hover:to-pink-500'
                                  : 'bg-transparent border-purple-400 dark:border-purple-500/60 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                              }`}
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
                        <Label className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Recorrência</Label>
                        <Select value={formData.recurring || 'none'}
                          onValueChange={(v) => setFormData({ ...formData, recurring: v as Task['recurring'] })}>
                          <SelectTrigger className="w-full py-px pl-0 bg-transparent outline-none focus:ring-0 border-0 border-b-2 border-purple-400 dark:border-purple-500 focus:outline-none text-slate-800 dark:text-slate-100 rounded-none shadow-none [&_svg]:text-purple-500 dark:[&_svg]:text-purple-400 data-[placeholder]:text-slate-400 dark:data-[placeholder]:text-slate-500"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Não recorrente</SelectItem>
                            <SelectItem value="daily">Diário</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Tags</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tags.slice(0, 4).map(tag => (
                            <Button
                              key={tag.id}
                              type="button"
                              size="sm"
                              variant={formData.tags.includes(tag.id) ? "default" : "outline"}
                              className={`text-xs h-6 px-2 ${
                                formData.tags.includes(tag.id)
                                  ? 'text-white'
                                  : 'bg-transparent border-purple-400 dark:border-purple-500/60 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                              }`}
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
                        <Label className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Subtarefas</Label>
                        <Button size="sm" variant="ghost" className="text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30" onClick={() => {
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
                          <Minus className="w-4 h-4 text-purple-400 dark:text-purple-500/70" />
                          <Input
                            placeholder={`Subtarefa ${index + 1}`}
                            value={subtask.title}
                            onChange={(e) => {
                              const updated = formData.subtasks.map(st =>
                                st.id === subtask.id ? { ...st, title: e.target.value } : st
                              );
                              setFormData({ ...formData, subtasks: updated });
                            }}
                            className="flex-1 h-8 text-sm bg-transparent outline-none focus:ring-0 border-0 border-b-2 border-purple-400 dark:border-purple-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-xs rounded-none shadow-none"
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30" onClick={() => {
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

                    <div className="inline-flex gap-5 pt-1">
                      <Button className="flex-1 px-6 focus:outline-none focus:scale-110 font-semibold text-xs py-2 rounded-[5px] hover:scale-110 transition-all text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/40 btn-glow" onClick={handleCreateTask} disabled={isSubmitting}>Publicar</Button>
                      <Button variant="outline" className="flex-1 px-6 focus:outline-none focus:scale-110 font-semibold text-xs py-2 rounded-[5px] hover:scale-110 transition-all text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-purple-400/50 dark:border-purple-500/40 shadow-lg shadow-slate-500/20" disabled={isSubmitting} onClick={async () => {
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
                  </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-2 md:px-3 py-3 md:py-4">
        <section className="mb-4 md:mb-6 relative overflow-hidden rounded-xl">
          <div className="flex items-center justify-between gap-2 select-none">
            <div>
              <motion.h2
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="text-xl md:text-3xl font-black tracking-tight leading-none text-slate-900 dark:text-white"
              >
                {'O seu dia, '}
                <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 bg-clip-text text-transparent">
                  {'em ordem.'}
                </span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="mt-1 text-xs md:text-sm text-slate-500 dark:text-slate-400"
              >
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </motion.p>
            </div>
          </div>
        </section>

        <div aria-hidden="true" className="relative mb-4 md:mb-6 overflow-hidden rounded-lg bg-slate-900 dark:bg-slate-950">
          <div className="flex w-max animate-marquee py-1.5 md:py-2">
            {Array.from({ length: 2 }).map((_, half) => (
              <div key={half} className="flex shrink-0 items-center">
                {['focar', 'concluir', 'produzir', 'acompanhar', 'evoluir', 'celebrar'].map((word) => (
                  <span key={word} className="mx-4 md:mx-6 whitespace-nowrap text-xs md:text-sm font-bold uppercase tracking-[0.25em] text-slate-300 dark:text-slate-400">
                    {word}
                    <span className="mx-1 text-pink-500">✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 md:mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <TabsTrigger value="tarefas" className="text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 rounded-md transition-all duration-200">
              <List className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Tarefas</span>
            </TabsTrigger>
            <TabsTrigger value="kanban" className="text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 rounded-md transition-all duration-200">
              <LayoutGrid className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Kanban</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tarefas" className="space-y-0">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-6" role="region" aria-label="Estatísticas">
                <Card className="glass-card border-l-4 border-l-blue-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/20">
                  <CardContent className="pt-3 pb-3">
                    <p className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">📅 Para Hoje</p>
                    <p className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{stats.today}</p>
                  </CardContent>
                </Card>
                <Card className="glass-card border-l-4 border-l-purple-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/20">
                  <CardContent className="pt-3 pb-3">
                    <p className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">Pendentes</p>
                    <p className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">{stats.pending}</p>
                  </CardContent>
                </Card>
                <Card className="glass-card border-l-4 border-l-orange-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-500/20">
                  <CardContent className="pt-3 pb-3">
                    <p className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">🔥 Sequência</p>
                    <p className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">{stats.streak} <span className="text-sm font-bold text-slate-400">dias</span></p>
                  </CardContent>
                </Card>
                <Card className="glass-card border-l-4 border-l-yellow-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-yellow-500/20">
                  <CardContent className="pt-3 pb-3">
                    <p className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">🏆 Conquistas</p>
                    <p className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">{unlockedAchievements}<span className="text-sm font-bold text-slate-400">/{achievements.length}</span></p>
                  </CardContent>
                </Card>
                <Card className="glass-card border-l-4 border-l-emerald-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/20">
                  <CardContent className="pt-3 pb-3">
                    <p className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">Concluídas</p>
                    <p className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">{stats.completed}</p>
                  </CardContent>
                </Card>
              </div>

        {tasks.filter(t => t.dueDate && t.status !== 'completed').length > 0 && (
          <Card className="glass-card mb-4 md:mb-6">
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

        <div className="flex flex-col sm:flex-row gap-2 md:gap-4 mb-2 md:mb-3">
          <div className="relative flex-1 glow-focus">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input placeholder="Buscar tarefas..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10 glass-card border-0" aria-label="Buscar tarefas" />
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

        <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-4 md:mb-6" role="group" aria-label="Filtros rápidos">
          <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
            <Zap className="w-3 h-3" aria-hidden="true" />
            Prioridade
          </span>
          {([
            { value: 'all', label: 'Todas' },
            { value: 'urgent', label: 'Urgente', dot: 'bg-red-500' },
            { value: 'high', label: 'Alta', dot: 'bg-orange-500' },
            { value: 'medium', label: 'Média', dot: 'bg-blue-500' },
            { value: 'low', label: 'Baixa', dot: 'bg-slate-400' },
          ] as { value: PriorityFilter; label: string; dot?: string }[]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPriorityFilter(opt.value === priorityFilter ? 'all' : opt.value)}
              title={`Filtrar por prioridade ${opt.label}`}
              aria-pressed={priorityFilter === opt.value}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] md:text-xs font-medium transition-all duration-200 active:scale-95 ${
                priorityFilter === opt.value
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {opt.dot && <span className={`w-2 h-2 rounded-full ${opt.dot} ${priorityFilter === opt.value ? 'opacity-90' : 'opacity-60'}`} aria-hidden="true" />}
              {opt.label}
            </button>
          ))}

          <Separator orientation="vertical" className="mx-1 h-4 hidden sm:inline-block" />

          <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            Prazo
          </span>
          {([
            { value: 'all', label: 'Todos' },
            { value: 'today', label: 'Vence hoje' },
            { value: 'overdue', label: 'Atrasadas' },
          ] as { value: DueFilter; label: string }[]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDueFilter(opt.value === dueFilter ? 'all' : opt.value)}
              title={`Filtrar por prazo: ${opt.label}`}
              aria-pressed={dueFilter === opt.value}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] md:text-xs font-medium transition-all duration-200 active:scale-95 ${
                dueFilter === opt.value
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}

          {(priorityFilter !== 'all' || dueFilter !== 'all') && (
            <button
              type="button"
              onClick={() => { setPriorityFilter('all'); setDueFilter('all'); }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              aria-label="Limpar filtros rápidos"
            >
              <X className="w-3 h-3" aria-hidden="true" />
              Limpar
            </button>
          )}
        </div>

        <div className="space-y-4 md:space-y-6">
          {tasksByEnergy.map(({ level, tasks: levelTasks }) => (
            levelTasks.length > 0 ? (
            <motion.div key={level} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: level * 0.1 }}>
              <Card className="glass-card overflow-hidden">
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
                            className="group p-3 md:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer active:bg-slate-100"
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
                                  <div className="w-full sm:w-auto min-w-0 sm:max-w-[60%]">
                                    <EditableTitle task={task} onRename={(id, title) => handleUpdateTaskDirect(id, { title })} />
                                  </div>
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

        {(() => {
          const hasActiveTasks = tasks.some(t => t.status !== 'completed' && t.status !== 'archived');
          const hasFilter = searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || dueFilter !== 'all';
          const hasVisibleCompleted = statusFilter === 'all' && filteredTasks.some(t => t.status === 'completed');
          if (!hasActiveTasks && !hasFilter && hasVisibleCompleted) {
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-xl p-8 text-center flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-1">
                  <CheckCheck className="w-7 h-7 text-emerald-400" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Tudo em dia!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  Você concluiu todas as tarefas ativas. As últimas concluídas aparecem na seção abaixo.
                </p>
              </motion.div>
            );
          }
          return null;
        })()}

        {filteredTasks.filter(t => t.status !== 'completed' && t.status !== 'archived').length === 0 && tasks.filter(t => t.status !== 'archived').length > 0 && statusFilter !== 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-8 text-center flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-1">
              <Search className="w-6 h-6 text-purple-400" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              Nenhum resultado encontrado
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Nenhuma tarefa atende aos filtros atuais. Ajuste a busca ou limpe os filtros para ver mais itens.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setDueFilter('all');
              }}
            >
              <X className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Limpar filtros
            </Button>
          </motion.div>
        )}

        {tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-8 md:p-12 text-center flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-sky-500/20 flex items-center justify-center mb-2">
              <CheckSquare className="w-8 h-8 text-purple-400" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">
              Nada por aqui ainda
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Que tal dar o primeiro passo? Crie sua primeira tarefa e comece a organizar o seu dia.
            </p>
            <Button
              className="mt-3 bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 active:scale-95 transition-all"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
              Criar minha primeira tarefa
            </Button>
          </motion.div>
        )}

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
              {tasks.length === 0 && (
                <div className="glass-card rounded-xl p-6 md:p-8 text-center flex flex-col items-center gap-2 mb-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-1">
                    <LayoutGrid className="w-7 h-7 text-purple-400" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Quadro ainda vazio</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                    Crie uma tarefa para começar a movê-la pelo quadro: arraste os cartões entre as colunas para acompanhar o progresso.
                  </p>
                  <Button
                    className="mt-2 bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 active:scale-95 transition-all"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    Criar tarefa
                  </Button>
                </div>
              )}
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
              <div>
                <Label className="flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
                  Recorrência
                </Label>
                <Select
                  value={editingTask.recurring || 'none'}
                  onValueChange={(v) => setEditingTask({ ...editingTask, recurring: v as Task['recurring'] })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não repetir</SelectItem>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ao concluir, agenda automaticamente a próxima ocorrência.
                </p>
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

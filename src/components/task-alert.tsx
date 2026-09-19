'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Calendar, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/types/task';

interface TaskAlertProps {
  task: Task | null;
  onDismiss: () => void;
  onComplete?: (taskId: string) => void;
}

const priorityConfig = {
  low: { color: 'from-slate-400 to-slate-500', label: 'Baixa', emoji: '😌' },
  medium: { color: 'from-blue-400 to-blue-500', label: 'Média', emoji: '😊' },
  high: { color: 'from-orange-400 to-orange-500', label: 'Alta', emoji: '🔥' },
  urgent: { color: 'from-red-400 to-red-500', label: 'Urgente', emoji: '⚡' },
};

export function TaskAlert({ task, onDismiss, onComplete }: TaskAlertProps) {
  if (!task) return null;

  const config = priorityConfig[task.priority];
  const dueTime = task.dueDate
    ? new Date(task.dueDate).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const dueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : null;

  return (
    <AnimatePresence>
      {task && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-6 right-6 z-[100] w-full max-w-sm"
        >
          <Card className="overflow-hidden border-2 shadow-2xl border-amber-300 dark:border-amber-600">
            <div className={`h-1.5 bg-gradient-to-r ${config.color}`} />
            
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{ 
                    duration: 0.6,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center"
                >
                  <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      Lembrete
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {config.emoji} {config.label}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {task.description}
                    </p>
                  )}

                  {(dueTime || dueDate) && (
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {dueDate}
                        </span>
                      )}
                      {dueTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {dueTime}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    {onComplete && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs h-7"
                        onClick={() => onComplete(task.id)}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Concluir
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-xs h-7"
                      onClick={onDismiss}
                    >
                      <X className="w-3 h-3" />
                      Dispensar
                    </Button>
                  </div>
                </div>

                <button
                  onClick={onDismiss}
                  className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label="Dispensar lembrete"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

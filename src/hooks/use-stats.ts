'use client';

import { useMemo } from 'react';
import { Task } from '@/types/task';

interface TaskStats {
  pending: number;
  completed: number;
  urgent: number;
  today: number;
  points: number;
  archived: number;
  streak: number;
}

export function useStats(tasks: Task[]): TaskStats {
  return useMemo(() => {
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const hasCompleted = completedTasks.some(t => {
        const completedDate = new Date((t as any).completedAt || t.createdAt);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === day.getTime();
      });
      if (hasCompleted) streak++;
      else if (i > 0) break;
    }

    return {
      pending: tasks.filter(t => t.status === 'pending').length,
      completed: completedTasks.length,
      urgent: tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length,
      today: tasks.filter(t => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate).toDateString() === today.toDateString();
      }).length,
      points: completedTasks.reduce((sum, t) => sum + t.points, 0),
      archived: tasks.filter(t => t.status === 'archived').length,
      streak,
    };
  }, [tasks]);
}

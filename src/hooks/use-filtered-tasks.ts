'use client';

import { useMemo } from 'react';
import { Task } from '@/types/task';

export type PriorityFilter = 'all' | Task['priority'];
export type DueFilter = 'all' | 'today' | 'overdue';

interface FilteredTasksResult {
  filteredTasks: Task[];
  tasksByEnergy: { level: number; tasks: Task[] }[];
}

function isSameLocalDay(date: Date, dayStart: Date): boolean {
  return (
    date.getFullYear() === dayStart.getFullYear() &&
    date.getMonth() === dayStart.getMonth() &&
    date.getDate() === dayStart.getDate()
  );
}

export function useFilteredTasks(
  tasks: Task[],
  searchQuery: string,
  statusFilter: string,
  priorityFilter: PriorityFilter,
  dueFilter: DueFilter
): FilteredTasksResult {
  return useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const filteredTasks = tasks.filter(t => {
      if (t.status === 'archived') return false;
      if (searchQuery && !t.title?.toLowerCase().includes(searchLower)) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (dueFilter !== 'all') {
        if (!t.dueDate || t.status === 'completed' || t.status === 'cancelled') return false;
        const due = new Date(t.dueDate);
        if (dueFilter === 'today' && !isSameLocalDay(due, todayStart)) return false;
        if (dueFilter === 'overdue' && due.getTime() >= todayStart.getTime()) return false;
      }
      return true;
    });

    const tasksByEnergy = [5, 4, 3, 2, 1].map(level => ({
      level,
      tasks: filteredTasks.filter(t => t.energyLevel === level && t.status !== 'completed'),
    }));

    return { filteredTasks, tasksByEnergy };
  }, [tasks, searchQuery, statusFilter, priorityFilter, dueFilter]);
}
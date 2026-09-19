'use client';

import { useMemo } from 'react';
import { Task } from '@/types/task';

interface FilteredTasksResult {
  filteredTasks: Task[];
  tasksByEnergy: { level: number; tasks: Task[] }[];
}

export function useFilteredTasks(
  tasks: Task[],
  searchQuery: string,
  statusFilter: string
): FilteredTasksResult {
  return useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    
    const filteredTasks = tasks.filter(t => {
      if (t.status === 'archived') return false;
      if (searchQuery && !t.title?.toLowerCase().includes(searchLower)) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      return true;
    });

    const tasksByEnergy = [5, 4, 3, 2, 1].map(level => ({
      level,
      tasks: filteredTasks.filter(t => t.energyLevel === level && t.status !== 'completed'),
    }));

    return { filteredTasks, tasksByEnergy };
  }, [tasks, searchQuery, statusFilter]);
}

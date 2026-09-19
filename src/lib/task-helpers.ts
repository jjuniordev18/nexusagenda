import { Task } from '@/types/task';

const STORAGE_KEY = 'nexus_tasks';

export function loadTasksFromStorage(): Task[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function saveTasksToStorage(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    console.error('Falha ao salvar tarefas no localStorage');
  }
}

export function addTaskToStorage(task: Task): Task[] {
  const existing = loadTasksFromStorage();
  const updated = [task, ...existing];
  saveTasksToStorage(updated);
  return updated;
}

export function updateTaskInStorage(id: string, updates: Partial<Task>): Task[] {
  const existing = loadTasksFromStorage();
  const updated = existing.map(t => t.id === id ? { ...t, ...updates } : t);
  saveTasksToStorage(updated);
  return updated;
}

export function removeTaskFromStorage(id: string): Task[] {
  const existing = loadTasksFromStorage();
  const updated = existing.filter(t => t.id !== id);
  saveTasksToStorage(updated);
  return updated;
}

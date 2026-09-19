export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  energyLevel: number;
  dueDate: string | null;
  points: number;
  createdAt: number;
  subtasks: Subtask[] | null;
  tags: string[] | null;
  recurring: 'none' | 'daily' | 'weekly' | 'monthly' | null;
  categoryId: string | null;
  reminders: number[] | null;
  archivedAt?: number | null;
  completedAt?: number | null;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: 'Briefcase' | 'User' | 'BookOpen';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
}

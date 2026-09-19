import { Task, Subtask } from '@/types/task';
import { createTaskSchema } from '@/lib/validations/task';

export function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function validateSubtasks(subtasks: unknown): Subtask[] {
  if (!subtasks || !Array.isArray(subtasks)) return [];
  return subtasks
    .filter((st): st is Subtask =>
      st != null &&
      typeof st === 'object' &&
      'id' in st && 'title' in st &&
      Boolean((st as Subtask).id) &&
      typeof (st as Subtask).title === 'string' &&
      (st as Subtask).title.trim().length > 0
    )
    .map(st => ({
      id: String(st.id),
      title: String(st.title).trim(),
      completed: Boolean(st.completed),
    }));
}

export function buildTask(
  data: {
    title: string;
    description?: string;
    priority?: Task['priority'];
    energyLevel?: number;
    dueDate?: string;
    categoryId?: string;
    tags?: string[];
    recurring?: Task['recurring'];
    subtasks?: unknown;
    reminders?: number[];
  },
  status: Task['status'] = 'pending'
): Task {
  const validated = createTaskSchema.parse({
    title: data.title,
    description: data.description,
    priority: data.priority,
    energyLevel: data.energyLevel,
    dueDate: data.dueDate,
    categoryId: data.categoryId,
    tags: data.tags,
  });

  const validSubtasks = validateSubtasks(data.subtasks);

  return {
    id: generateTaskId(),
    title: validated.title,
    description: validated.description || null,
    priority: validated.priority,
    energyLevel: validated.energyLevel,
    dueDate: validated.dueDate || null,
    categoryId: validated.categoryId || null,
    status,
    points: validated.energyLevel * 5,
    createdAt: Date.now(),
    tags: validated.tags && validated.tags.length > 0 ? validated.tags : null,
    recurring: data.recurring && data.recurring !== 'none' ? data.recurring : null,
    subtasks: validSubtasks.length > 0 ? validSubtasks : null,
    reminders: data.reminders && data.reminders.length > 0 ? data.reminders : null,
  };
}

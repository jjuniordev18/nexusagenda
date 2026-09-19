'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Task } from '@/types/task';

interface AlertedTask {
  id: string;
  alertedAt: number;
}

const ALERT_WINDOW_MS = 60000;

export function useTaskNotifications(tasks: Task[]) {
  const [activeAlert, setActiveAlert] = useState<Task | null>(null);
  const alertedTasksRef = useRef<Map<string, AlertedTask>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scheduledRemindersRef = useRef<Set<string>>(new Set());

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);

  const sendPushNotification = useCallback(async (task: Task, minutesBefore?: number) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const priorityEmoji: Record<string, string> = {
        low: '😌',
        medium: '😊',
        high: '🔥',
        urgent: '⚡',
      };

      const dueTime = task.dueDate
        ? new Date(task.dueDate).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';

      const reminderText = minutesBefore 
        ? minutesBefore >= 60 
          ? ` (${minutesBefore / 60} hora${minutesBefore >= 120 ? 's' : ''} antes)`
          : ` (${minutesBefore} min antes)`
        : '';

      await registration.showNotification('Nexus - Lembrete de Tarefa', {
        body: `${priorityEmoji[task.priority]} ${task.title}${dueTime ? ` - ${dueTime}` : ''}${reminderText}`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `task-alert-${task.id}-${minutesBefore || 0}`,
        requireInteraction: true,
        data: { taskId: task.id },
      });
    } catch (err) {
      console.error('Erro ao enviar notificação:', err);
    }
  }, []);

  const playAlertSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch {}
  }, []);

  const triggerAlert = useCallback((task: Task, minutesBefore?: number) => {
    const now = Date.now();
    const alertKey = `${task.id}-${minutesBefore || 0}`;
    const alerted = alertedTasksRef.current.get(alertKey);
    if (alerted && now - alerted.alertedAt < 5 * 60 * 1000) return;

    alertedTasksRef.current.set(alertKey, { id: alertKey, alertedAt: now });
    if (!minutesBefore) {
      setActiveAlert(task);
    }
    sendPushNotification(task, minutesBefore);
    if (!minutesBefore) {
      playAlertSound();
    }
  }, [sendPushNotification, playAlertSound]);

  const scheduleNextAlert = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const now = Date.now();
    let soonestTime = Infinity;
    let soonestTask: Task | null = null;
    let soonestMinutesBefore: number | undefined;

    for (const task of tasks) {
      if (task.status === 'completed' || task.status === 'cancelled' || !task.dueDate) continue;

      const dueTime = new Date(task.dueDate).getTime();

      if (task.reminders && task.reminders.length > 0) {
        for (const minutes of task.reminders) {
          const reminderTime = dueTime - (minutes * 60 * 1000);
          const reminderKey = `${task.id}-${minutes}`;
          
          if (scheduledRemindersRef.current.has(reminderKey)) continue;
          
          const alerted = alertedTasksRef.current.get(reminderKey);
          if (alerted && now - alerted.alertedAt < 5 * 60 * 1000) {
            scheduledRemindersRef.current.add(reminderKey);
            continue;
          }

          if (reminderTime <= now + ALERT_WINDOW_MS && reminderTime >= now - ALERT_WINDOW_MS) {
            scheduledRemindersRef.current.add(reminderKey);
            triggerAlert(task, minutes);
            continue;
          }

          if (reminderTime > now && reminderTime < soonestTime) {
            soonestTime = reminderTime;
            soonestTask = task;
            soonestMinutesBefore = minutes;
          }
        }
      }

      const alerted = alertedTasksRef.current.get(task.id);
      if (alerted && now - alerted.alertedAt < 5 * 60 * 1000) continue;

      if (dueTime <= now + ALERT_WINDOW_MS && dueTime >= now - ALERT_WINDOW_MS) {
        triggerAlert(task);
        continue;
      }

      if (dueTime > now && dueTime < soonestTime) {
        soonestTime = dueTime;
        soonestTask = task;
        soonestMinutesBefore = undefined;
      }
    }

    if (soonestTask && soonestTime !== Infinity) {
      const delay = Math.max(soonestTime - now, 1000);
      const taskToAlert = soonestTask;
      const minutesBefore = soonestMinutesBefore;
      timeoutRef.current = setTimeout(() => {
        triggerAlert(taskToAlert, minutesBefore);
        scheduleNextAlert();
      }, delay);
    }
  }, [tasks, triggerAlert]);

  useEffect(() => {
    scheduleNextAlert();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [scheduleNextAlert]);

  const scheduleTaskNotification = useCallback(async (task: Task) => {
    if (!task.dueDate || !('serviceWorker' in navigator)) return;

    const scheduledTime = new Date(task.dueDate).getTime();
    if (scheduledTime - Date.now() < 60000) return;

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    try {
      const registration = await navigator.serviceWorker.ready;

      const priorityEmoji: Record<string, string> = {
        low: '😌', medium: '😊', high: '🔥', urgent: '⚡',
      };

      const dueTime = new Date(task.dueDate).toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit',
      });

      if (registration.active) {
        registration.active.postMessage({
          type: 'SCHEDULE_NOTIFICATION',
          taskId: task.id,
          title: 'Nexus - Lembrete de Tarefa',
          body: `${priorityEmoji[task.priority]} ${task.title} - ${dueTime}`,
          scheduledTime,
        });
      }
    } catch (err) {
      console.error('Erro ao agendar notificação:', err);
    }
  }, [requestNotificationPermission]);

  const dismissAlert = useCallback(() => setActiveAlert(null), []);

  return {
    activeAlert,
    dismissAlert,
    requestNotificationPermission,
    scheduleTaskNotification,
  };
}

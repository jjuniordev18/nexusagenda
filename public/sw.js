// Nexus - Agenda Inteligente - Service Worker
// Gerencia notificações push no smartphone

const CACHE_NAME = 'nexus-v1';

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Intercepta notificações push
self.addEventListener('push', (event) => {
  let data = { title: 'Nexus', body: 'Você tem uma tarefa agendada!' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'nexus-notification',
    requireInteraction: true,
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;

  if (action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Background sync para verificar tarefas offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-tasks') {
    event.waitUntil(checkScheduledNotifications());
  }
});

// Verificar notificações agendadas periodicamente (fallback para setTimeout)
async function checkScheduledNotifications() {
  const cache = await caches.open('nexus-scheduled');
  const requests = await cache.keys();
  const now = Date.now();

  for (const request of requests) {
    try {
      const response = await cache.match(request);
      const data = await response.json();

      if (data.scheduledTime && data.scheduledTime <= now) {
        await self.registration.showNotification('Nexus - Lembrete', {
          body: data.body,
          icon: '/favicon.svg',
          tag: `task-${data.taskId}`,
          requireInteraction: true,
          data: { taskId: data.taskId },
        });
        await cache.delete(request);
      }
    } catch (e) {
      // Cache entry invalid, skip
    }
  }
}

// Mensagens do app principal
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { taskId, title, body, scheduledTime } = event.data;
    const now = Date.now();
    const delay = scheduledTime - now;

    if (delay > 0 && delay < 2147483647) {
      // Usar setTimeout para atrasos viáveis
      setTimeout(() => {
        self.registration.showNotification('Nexus - Lembrete', {
          body: body,
          icon: '/favicon.svg',
          tag: `task-${taskId}`,
          requireInteraction: true,
          data: { taskId },
        });
      }, delay);
    }

    // Também salvar no cache como fallback para sync periódico
    caches.open('nexus-scheduled').then(async (cache) => {
      const entry = new Response(JSON.stringify({ taskId, body, scheduledTime }));
      await cache.put(`/scheduled-${taskId}-${scheduledTime}`, entry);
    });
  }
});

// Limpar entradas de cache expiradas a cada ativação
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.open('nexus-scheduled').then(async (cache) => {
      const keys = await cache.keys();
      const now = Date.now();
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const data = await response.json();
          if (data.scheduledTime && data.scheduledTime < now - 86400000) {
            await cache.delete(request);
          }
        }
      }
    })
  );
});

'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[Nexus] Service Worker registrado:', registration.scope);
        })
        .catch((error) => {
          console.log('[Nexus] Erro ao registrar Service Worker:', error);
        });
    }
  }, []);

  return null;
}

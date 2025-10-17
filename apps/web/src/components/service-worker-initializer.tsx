'use client';

import { useEffect } from 'react';
import { deletePendingCheckIn, getPendingCheckIns, markRetry } from '@/lib/offlineQueue';

const syncPending = async () => {
  const pending = await getPendingCheckIns();
  if (!pending.length) return;

  for (const record of pending) {
    try {
      const response = await fetch('/api/checkins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
      });

      if (!response.ok) {
        console.error('No se pudo sincronizar check-in', response.status);
        await markRetry(record.id);
        continue;
      }

      try {
        const payload = (await response.json()) as { ok?: boolean };
        if (!payload?.ok) {
          await markRetry(record.id);
          continue;
        }
      } catch (error) {
        console.error('Error interpretando respuesta de sincronización', error);
        await markRetry(record.id);
        continue;
      }

      await deletePendingCheckIn(record.id);
    } catch (error) {
      console.error('Sync error', error);
      await markRetry(record.id);
    }
  }
};

export const ServiceWorkerInitializer = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.debug('SW registered'))
        .catch((error) => console.error('SW registration failed', error));
    }

    const handleOnline = () => {
      void syncPending();
    };

    window.addEventListener('online', handleOnline);
    if (navigator.onLine) {
      void syncPending();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return null;
};

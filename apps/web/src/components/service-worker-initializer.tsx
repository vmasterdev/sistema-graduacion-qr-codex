'use client';

import { useEffect } from 'react';
import { deletePendingCheckIn, getPendingCheckIns, markRetry } from '@/lib/offlineQueue';
import { getAppCheckToken, initAppCheck } from '@/lib/firebase';
import { getFunctionsUrl } from '@/lib/config';

const syncPending = async () => {
  const pending = await getPendingCheckIns();
  if (!pending.length) return;

  for (const record of pending) {
    try {
      const endpoint = getFunctionsUrl('/sync-checkins');
      const appCheckToken = await getAppCheckToken();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {}),
        },
        body: JSON.stringify(record),
      });

      if (!response.ok) {
        console.error('No se pudo sincronizar check-in', response.status);
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
    initAppCheck();

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

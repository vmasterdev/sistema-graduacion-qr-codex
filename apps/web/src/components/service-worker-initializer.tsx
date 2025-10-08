'use client';

import { useEffect } from 'react';
import { deletePendingCheckIn, getPendingCheckIns, markRetry } from '@/lib/offlineQueue';
import { getAppCheckToken, initAppCheck } from '@/lib/firebase';

const syncPending = async () => {
  const pending = await getPendingCheckIns();
  if (!pending.length) return;

  for (const record of pending) {
    try {
      const appCheckToken = await getAppCheckToken();
      const response = await fetch('/api/sync-checkins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(appCheckToken ? { 'X-App-Check': appCheckToken } : {}),
        },
        body: JSON.stringify(record),
      });

      if (!response.ok) {
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

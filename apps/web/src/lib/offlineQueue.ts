import { openDB, DBSchema } from 'idb';
import { OfflineCheckInPayload, PendingSyncRecord } from '@/types';

interface CheckInDB extends DBSchema {
  pending: {
    key: string;
    value: PendingSyncRecord;
  };
}

const DB_NAME = 'grad-queue';
const DB_VERSION = 1;
const STORE = 'pending';

const getDb = async () => {
  return openDB<CheckInDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: 'id' });
      }
    },
  });
};

export const queueCheckIn = async (payload: OfflineCheckInPayload) => {
  const db = await getDb();
  const record: PendingSyncRecord = {
    ...payload,
    id: `${payload.ticketCode}-${payload.scannedAt}`,
    retryCount: 0,
  };
  await db.put(STORE, record);
};

export const getPendingCheckIns = async (): Promise<PendingSyncRecord[]> => {
  const db = await getDb();
  return db.getAll(STORE);
};

export const deletePendingCheckIn = async (id: string) => {
  const db = await getDb();
  await db.delete(STORE, id);
};

export const markRetry = async (id: string) => {
  const db = await getDb();
  const record = await db.get(STORE, id);
  if (!record) return;
  record.retryCount += 1;
  record.lastTriedAt = new Date().toISOString();
  await db.put(STORE, record);
};

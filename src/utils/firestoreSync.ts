/**
 * Firestore synchronization layer for the KPI evaluation system.
 *
 * Strategy: keep localStorage as a fast offline cache, but mirror the main
 * collections (users, tasks, late_config, period_config, logo) to Firestore
 * so data persists across devices / logins.
 *
 * Each "collection" is stored as a single document under a `kpi_data` root
 * collection. This keeps the data model simple and avoids per-item writes
 * (which would be heavy and race-prone). The document holds the full array
 * in a single field.
 *
 *   kpi_data / users_doc        -> { value: User[], updatedAt }
 *   kpi_data / tasks_doc        -> { value: KpiTask[], updatedAt }
 *   kpi_data / late_config_doc  -> { value: LateRuleConfig, updatedAt }
 *   kpi_data / period_config_doc-> { value: EvaluationPeriodConfig, updatedAt }
 *   kpi_data / logo_doc         -> { value: string (base64 data URL), updatedAt }
 *
 * Echo suppression strategy (robust against the "tự nhiên xóa trắng hết" bug):
 * Whenever we write to a doc, we set a per-doc "pause" timer for PAUSE_MS.
 * Any onSnapshot event that arrives during the pause window is treated as our
 * own echo and dropped. Timestamp-based matching is brittle (Firestore may
 * round/serialize timestamps differently), so a time-window is far more
 * reliable. Genuine cross-device updates that arrive later still apply.
 */

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  User,
  KpiTask,
  LateRuleConfig,
  EvaluationPeriodConfig,
  Meeting,
  WeeklySchedule,
} from '../types';

const ROOT = 'kpi_data';
const USERS_DOC = 'users_doc';
const TASKS_DOC = 'tasks_doc';
const LATE_CONFIG_DOC = 'late_config_doc';
const PERIOD_CONFIG_DOC = 'period_config_doc';
const LOGO_DOC = 'logo_doc';
const MEETINGS_DOC = 'meetings_doc';
const WEEKLY_SCHEDULES_DOC = 'weekly_schedules_doc';

// How long (ms) to ignore onSnapshot echoes after we write. Firestore typically
// echoes within a few hundred ms; 2.5s is a safe, conservative window.
const PAUSE_MS = 2500;

export interface SyncEnvelope<T> {
  value: T;
  updatedAt: string;
}

// Per-doc pause-until timestamp (epoch ms). While Date.now() < this, the watcher
// treats incoming snapshots as echoes of our own write and drops them.
const pauseUntil: Record<string, number> = {};
// The last value we ourselves wrote, per doc. While paused we also remember it
// so that if an echo somehow slips through after the pause we can still compare.
const lastWrittenValue: Record<string, unknown> = {};

function pause(docId: string): void {
  pauseUntil[docId] = Date.now() + PAUSE_MS;
}

function isPaused(docId: string): boolean {
  const until = pauseUntil[docId];
  return typeof until === 'number' && Date.now() < until;
}

/** Read envelope with support for chunked data */
async function readEnvelope<T>(docId: string): Promise<SyncEnvelope<T> | null> {
  try {
    const ref = doc(db, ROOT, docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as any;
    
    // Nếu là chunked data, đọc tất cả các chunks
    if (data?.isChunked && data?.totalChunks > 1) {
      console.log(`Firestore: Reading chunked data from ${docId} (${data.totalChunks} chunks)`);
      const allItems: any[] = [...(data.value || [])];
      
      for (let i = 1; i < data.totalChunks; i++) {
        const chunkRef = doc(db, ROOT, `${docId}_chunk_${i}`);
        const chunkSnap = await getDoc(chunkRef);
        if (chunkSnap.exists()) {
          const chunkData = chunkSnap.data() as any;
          if (Array.isArray(chunkData?.value)) {
            allItems.push(...chunkData.value);
          }
        }
      }
      console.log(`Firestore: Reassembled ${allItems.length} items from ${data.totalChunks} chunks`);
      return {
        value: allItems as T,
        updatedAt: data?.updatedAt ?? '',
      };
    }
    
    return {
      value: data?.value as T,
      updatedAt: data?.updatedAt ?? '',
    };
  } catch {
    return null;
  }
}

/** Write a single envelope document (merge-replace). Sets the echo-suppression pause window for this doc. */
async function writeEnvelope<T>(docId: string, value: T): Promise<void> {
  lastWrittenValue[docId] = value;
  pause(docId);
  try {
    const ref = doc(db, ROOT, docId);
    const serialized = JSON.stringify(value);
    const sizeBytes = new Blob([serialized]).size;
    const MAX_BYTES = 1_000_000; // 1MB - giới hạn Firestore document

    if (sizeBytes > MAX_BYTES && Array.isArray(value)) {
      console.warn(`Firestore: Data too large (${sizeBytes} bytes), attempting chunked save for ${docId}`);
      // Chia nhỏ thành nhiều document (chunking)
      const items = value as any[];
      const chunks: any[][] = [];
      let currentChunk: any[] = [];
      let currentSize = 0;
      
      for (const item of items) {
        const itemStr = JSON.stringify(item);
        const itemSize = new Blob([itemStr]).size;
        
        if (currentSize + itemSize > MAX_BYTES * 0.9 && currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentSize = 0;
        }
        currentChunk.push(item);
        currentSize += itemSize;
      }
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
      
      console.log(`Firestore: Splitting ${items.length} items into ${chunks.length} chunks`);
      
      // Lưu chunk đầu tiên vào document chính, các chunk còn lại vào sub-documents
      for (let i = 0; i < chunks.length; i++) {
        const chunkRef = i === 0 ? ref : doc(db, ROOT, `${docId}_chunk_${i}`);
        await setDoc(chunkRef, {
          value: chunks[i],
          updatedAt: new Date().toISOString(),
          chunkIndex: i,
          totalChunks: chunks.length,
          isChunked: true,
        });
        console.log(`Firestore: Saved chunk ${i + 1}/${chunks.length} (${chunks[i].length} items)`);
      }
      return;
    }

    await setDoc(ref, {
      value,
      updatedAt: new Date().toISOString(),
    });
    console.log(`Firestore: Saved ${docId} (${sizeBytes} bytes)`);
  } catch (error) {
    console.error(`Firestore write error for ${docId}:`, error);
    throw error; // Re-throw để caller biết
  }
}

/* ----------------------------- USERS ----------------------------- */

export async function fsLoadUsers(): Promise<User[] | null> {
  const env = await readEnvelope<User[]>(USERS_DOC);
  return env ? env.value : null;
}

export async function fsSaveUsers(users: User[]): Promise<void> {
  await writeEnvelope(USERS_DOC, users);
}

export function fsWatchUsers(onData: (users: User[], updatedAt: string) => void): Unsubscribe {
  const ref = doc(db, ROOT, USERS_DOC);
  return onSnapshot(
    ref,
    (snap) => {
      if (isPaused(USERS_DOC)) return; // drop echo of our own write
      if (!snap.exists()) return;
      const data = snap.data() as any;
      if (!Array.isArray(data?.value)) return;
      onData(data.value as User[], data?.updatedAt ?? '');
    },
    () => {
      // Silently ignore watch errors
    },
  );
}

/* ----------------------------- TASKS ----------------------------- */

export async function fsLoadTasks(): Promise<KpiTask[] | null> {
  console.log('fsLoadTasks: Loading tasks from Firestore');
  try {
    const env = await readEnvelope<KpiTask[]>(TASKS_DOC);
    const result = env ? env.value : null;
    console.log(`fsLoadTasks: Loaded ${result?.length ?? 0} tasks`);
    return result;
  } catch (error) {
    console.error('fsLoadTasks: Failed to load from Firestore:', error);
    return null;
  }
}

export async function fsSaveTasks(tasks: KpiTask[]): Promise<void> {
  if (tasks.length === 0) {
    console.warn('fsSaveTasks: Attempting to save empty tasks array - this may clear Firestore data');
  }
  console.log(`fsSaveTasks: Saving ${tasks.length} tasks to Firestore`);
  try {
    await writeEnvelope(TASKS_DOC, tasks);
    console.log('fsSaveTasks: Completed successfully');
  } catch (error) {
    console.error('fsSaveTasks: Failed to save to Firestore:', error);
    // Fallback: Lưu vào localStorage để không mất dữ liệu
    console.log('fsSaveTasks: Data saved to localStorage only');
    throw error;
  }
}

export function fsWatchTasks(onData: (tasks: KpiTask[], updatedAt: string) => void): Unsubscribe {
  const ref = doc(db, ROOT, TASKS_DOC);
  return onSnapshot(
    ref,
    async (snap) => {
      if (isPaused(TASKS_DOC)) return; // drop echo of our own write
      if (!snap.exists()) return;
      const data = snap.data() as any;
      
      // Handle chunked data
      if (data?.isChunked && data?.totalChunks > 1) {
        console.log(`fsWatchTasks: Detected chunked data (${data.totalChunks} chunks), reassembling...`);
        const allItems: KpiTask[] = [...(data.value || [])];
        
        for (let i = 1; i < data.totalChunks; i++) {
          const chunkRef = doc(db, ROOT, `${TASKS_DOC}_chunk_${i}`);
          const chunkSnap = await getDoc(chunkRef);
          if (chunkSnap.exists()) {
            const chunkData = chunkSnap.data() as any;
            if (Array.isArray(chunkData?.value)) {
              allItems.push(...chunkData.value);
            }
          }
        }
        console.log(`fsWatchTasks: Reassembled ${allItems.length} tasks from ${data.totalChunks} chunks`);
        onData(allItems, data?.updatedAt ?? '');
        return;
      }
      
      if (!Array.isArray(data?.value)) return;
      onData(data.value as KpiTask[], data?.updatedAt ?? '');
    },
    () => {
      // Silently ignore watch errors
    },
  );
}

/* -------------------------- LATE CONFIG -------------------------- */

export async function fsLoadLateConfig(): Promise<LateRuleConfig | null> {
  const env = await readEnvelope<LateRuleConfig>(LATE_CONFIG_DOC);
  return env ? env.value : null;
}

export async function fsSaveLateConfig(cfg: LateRuleConfig): Promise<void> {
  await writeEnvelope(LATE_CONFIG_DOC, cfg);
}

/* ------------------------ PERIOD CONFIG -------------------------- */

export async function fsLoadPeriodConfig(): Promise<EvaluationPeriodConfig | null> {
  const env = await readEnvelope<EvaluationPeriodConfig>(PERIOD_CONFIG_DOC);
  return env ? env.value : null;
}

export async function fsSavePeriodConfig(cfg: EvaluationPeriodConfig): Promise<void> {
  await writeEnvelope(PERIOD_CONFIG_DOC, cfg);
}

/* ----------------------------- LOGO ------------------------------ */

export async function fsLoadLogo(): Promise<string | null> {
  const env = await readEnvelope<string>(LOGO_DOC);
  return env ? env.value : null;
}

export async function fsSaveLogo(logoDataUrl: string): Promise<void> {
  await writeEnvelope(LOGO_DOC, logoDataUrl);
}

/* --------------------------- MEETINGS ---------------------------- */

export async function fsLoadMeetings(): Promise<Meeting[] | null> {
  const env = await readEnvelope<Meeting[]>(MEETINGS_DOC);
  return env ? env.value : null;
}

export async function fsSaveMeetings(meetings: Meeting[]): Promise<void> {
  await writeEnvelope(MEETINGS_DOC, meetings);
}

export function fsWatchMeetings(onData: (meetings: Meeting[], updatedAt: string) => void): Unsubscribe {
  const ref = doc(db, ROOT, MEETINGS_DOC);
  return onSnapshot(
    ref,
    (snap) => {
      if (isPaused(MEETINGS_DOC)) return;
      if (!snap.exists()) return;
      const data = snap.data() as any;
      if (!Array.isArray(data?.value)) return;
      onData(data.value as Meeting[], data?.updatedAt ?? '');
    },
    () => {
      // Silently ignore
    },
  );
}

/* ----------------------- WEEKLY SCHEDULES ------------------------ */

export async function fsLoadWeeklySchedules(): Promise<WeeklySchedule[] | null> {
  const env = await readEnvelope<WeeklySchedule[]>(WEEKLY_SCHEDULES_DOC);
  return env ? env.value : null;
}

export async function fsSaveWeeklySchedules(schedules: WeeklySchedule[]): Promise<void> {
  await writeEnvelope(WEEKLY_SCHEDULES_DOC, schedules);
}

export function fsWatchWeeklySchedules(onData: (schedules: WeeklySchedule[], updatedAt: string) => void): Unsubscribe {
  const ref = doc(db, ROOT, WEEKLY_SCHEDULES_DOC);
  return onSnapshot(
    ref,
    (snap) => {
      if (isPaused(WEEKLY_SCHEDULES_DOC)) return;
      if (!snap.exists()) return;
      const data = snap.data() as any;
      if (!Array.isArray(data?.value)) return;
      onData(data.value as WeeklySchedule[], data?.updatedAt ?? '');
    },
    () => {
      // Silently ignore
    },
  );
}


import type { Snapshot } from '../../store/droneStore';
import type { Task } from '../design';
import type { WorkflowEdge } from './types';

export interface Branch {
  id: string;
  title: string;
  parentId?: string;
  variantId: string;
  createdAt: string;
  snapshot: Snapshot;
  copied: boolean;
}
type ImageMaterial = { file: File; historyNodeId?: never } | { file?: never; historyNodeId: string };
export type Attachment = { id: string; title: string; createdAt: string } & ImageMaterial;
export interface BoardRecords {
  branches: Branch[];
  images: Attachment[];
  references: WorkflowEdge[];
}
export const emptyRecords = (): BoardRecords => ({ branches: [], images: [], references: [] });

const table = 'boards';
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('multirotor-studio-workflow-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(table);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开画布的本机存储。'));
  });
}

// Validate and commit against the newest board in one transaction, including edits from other tabs.
async function access(task: Task, update?: (records: BoardRecords) => void) {
  const db = await database();
  return new Promise<BoardRecords>((resolve, reject) => {
    const tx = db.transaction(table, update ? 'readwrite' : 'readonly');
    const store = tx.objectStore(table);
    const request = store.get(task);
    let records: BoardRecords;
    let cause: unknown;
    request.onsuccess = () => {
      records = request.result ?? emptyRecords();
      if (!update) return;
      try {
        update(records);
        store.put(records, task);
      } catch (error) {
        cause = error;
        tx.abort();
      }
    };
    tx.oncomplete = () => { db.close(); resolve(records); };
    tx.onabort = () => { db.close(); reject(cause ?? tx.error ?? new Error('画布未能保存到本机。')); };
  });
}
export const readRecords = (task: Task) => access(task);
export function workflowChannel() {
  try { return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('multirotor-studio-workflow'); }
  catch { return null; } // Restricted file origins may still allow local IndexedDB.
}
export async function updateRecords(task: Task, update: (records: BoardRecords) => void) {
  const records = await access(task, update);
  window.dispatchEvent(new CustomEvent('workflow-record-change', { detail: task }));
  const channel = workflowChannel();
  try { channel?.postMessage(task); } catch { /* The local commit has already succeeded. */ }
  finally { channel?.close(); }
  return records;
}
export function newWorkflowId(prefix: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return prefix + '-' + Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
}

// 研究场次的方式：一场只用一种生成方式时，把另一种方式的入口和卡片收起来。
// 两种方式用的是同一块画布、同一个模型后端、同一套生成设置和同一种轮次记录；差别只在设计者怎样告诉模型要什么。
import { useSyncExternalStore } from 'react';
import type { WorkflowNode } from './workflow/types';

export type SessionMethod = 'open' | 'structured' | 'free';
export const sessionMethods: { id: SessionMethod; label: string; note: string }[] = [
  { id: 'open', label: '不限', note: '两种方式都可以用。平时设计用这个。' },
  { id: 'structured', label: '结构化', note: '定目标、调造型，再生成。发给模型的是布局条件图和由造型编译的文字。' },
  { id: 'free', label: '自由提示', note: '只写文字。发给模型的就是这段原文；目标、造型和用户依据的卡片收起。' },
];

const key = 'multirotor-studio/session-method';
const listeners = new Set<() => void>();
function read(): SessionMethod {
  try { const saved = localStorage.getItem(key); return saved === 'structured' || saved === 'free' ? saved : 'open'; }
  catch { return 'open'; }
}
let current: SessionMethod = typeof window === 'undefined' ? 'open' : read();

export function setSessionMethod(next: SessionMethod) {
  current = next;
  try { localStorage.setItem(key, next); } catch { /* 没有浏览器存储时，设置只在本页有效。 */ }
  listeners.forEach(listener => listener());
}
export function useSessionMethod() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => current, () => 'open' as SessionMethod);
}

/** 这一场里画布上显示哪些卡片。 */
export function shownIn(method: SessionMethod, node: WorkflowNode) {
  if (method === 'open') return true;
  if (method === 'structured') return node.method !== 'free';
  // 自由提示场次：只留自由提示的轮次、它们的回图和取舍，以及设计者自己放上来的便签和参考图。
  if (node.method) return node.method === 'free';
  return node.kind === 'note' ? !!node.editable : node.kind === 'image' && !!node.removable;
}

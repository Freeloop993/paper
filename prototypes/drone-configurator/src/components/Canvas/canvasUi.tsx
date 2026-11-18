// 画布与右侧面板共用的界面状态：正在看的部件、视图、叠加层、对话给出的试调预览，以及还没保存的目标文字。
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useDroneStore } from '../../store/droneStore';
import type { ParameterGroup } from '../../types/DroneParameters';
import type { WidthPreview } from '../Studio/DesignChat';

export type StageView = 'top' | 'guide' | 'side';
export interface Overlays { dims: boolean; fov: boolean; hidden: boolean }
export interface CanvasUi {
  part: ParameterGroup;
  setPart: (part: ParameterGroup) => void;
  view: StageView;
  setView: (view: StageView) => void;
  overlays: Overlays;
  toggleOverlay: (key: keyof Overlays) => void;
  preview: WidthPreview | null;
  setPreview: (preview: WidthPreview | null) => void;
  /** 目标卡片与目标面板共用的草稿文字。保存前不写入方案。 */
  goalText: string;
  setGoalText: (text: string) => void;
  /** 设计者为当前这段文字改过的话题或使用状态。 */
  goalChoice: GoalChoice;
  setGoalChoice: (choice: GoalChoice) => void;
}
export interface GoalChoice { text: string; topic?: string; state?: string }

const Context = createContext<CanvasUi | null>(null);

export function CanvasUiProvider({ children, initialPart, initialGoal }: { children: ReactNode; initialPart?: ParameterGroup | null; initialGoal?: string }) {
  const { intent, activeVariant } = useDroneStore();
  const [part, choosePart] = useState<ParameterGroup>(initialPart ?? 'frame');
  const [view, setView] = useState<StageView>('top');
  const [overlays, setOverlays] = useState<Overlays>({ dims: true, fov: true, hidden: true });
  const [preview, setPreview] = useState<WidthPreview | null>(null);
  const draftKey = 'multirotor-goal-draft/' + activeVariant;
  const readDraft = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
      if (saved?.base === intent.note && typeof saved.text === 'string') return saved.text as string;
    } catch { /* 没有浏览器存储时，草稿只留在本页。 */ }
    return intent.note;
  };
  const [goal, setGoal] = useState(() => ({ variant: activeVariant, base: intent.note, text: initialGoal || readDraft() }));
  // 切换方向、撤销或在别处保存目标后，卡片上的文字跟着回到该方向已保存的目标。
  if (goal.variant !== activeVariant || goal.base !== intent.note) setGoal({ variant: activeVariant, base: intent.note, text: readDraft() });
  useEffect(() => {
    try { sessionStorage.setItem(draftKey, JSON.stringify({ text: goal.text, base: goal.base })); }
    catch { /* 草稿仍可继续编辑。 */ }
  }, [draftKey, goal.text, goal.base]);
  const [goalChoice, setGoalChoice] = useState<GoalChoice>({ text: goal.text });
  const setPart = useCallback((next: ParameterGroup) => {
    choosePart(next);
    if (next === 'landing_gear') setView('side');
  }, []);
  const setGoalText = useCallback((text: string) => setGoal(current => ({ ...current, text })), []);
  const toggleOverlay = useCallback((key: keyof Overlays) => setOverlays(o => ({ ...o, [key]: !o[key] })), []);
  const value = useMemo<CanvasUi>(() => ({ part, setPart, view, setView, overlays, toggleOverlay, preview, setPreview,
    goalText: goal.text, setGoalText, goalChoice, setGoalChoice }),
    [part, setPart, view, overlays, toggleOverlay, preview, goal.text, setGoalText, goalChoice]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCanvasUi() {
  const value = useContext(Context);
  if (!value) throw new Error('画布界面状态只在工作台内可用。');
  return value;
}

import { createContext, useContext } from 'react';
import { frameRules, quadBladeCount, type Task } from '../design/design';
import { fieldByPath, getPath, setPath, wordPairs } from '../design/fields';
import { create } from 'zustand';
import type {
  DroneParameters, AppState, FrameParameters, PropulsionParameters, FuselageParameters, LandingGearParameters,
  AccessoriesParameters, UserProfile, DesignIntent, WordPairId, ParameterGroup,
} from '../types/DroneParameters';
import type { PromptOptimizationResult } from '../services/geminiPromptOptimizer';

// 默认参数值。造型项（材料、臂根、机身轮廓、顶盖、相机安装、主色、表面处理）默认留白，由设计者决定。
const defaultParameters: DroneParameters = {
  frame: {
    frame_type: 'True X', wheelbase_mm: 250, span_ratio_wl: 1, arm_thickness_mm: '4mm', arm_width_mm: '15mm',
    material_visual: '', arm_root: '',
  },
  propulsion: { prop_diameter_inch: 5.0, prop_blade_count: '3叶', motor_tilt_degree: 0, prop_guard: 'none' },
  fuselage: { fuselage_style: '', top_cover: '', fuselage_dimensions_mm: { length: 100, width: 80, height: 30 } },
  landing_gear: { landing_gear_style: '低矮滑撬/支腿', landing_gear_height_mm: 40 },
  accessories: { has_camera_gimbal: false, camera_mount: '', custom_prompt_additions: '', drone_primary_color: '', surface_finish: '' },
};

export const emptyIntent = (): DesignIntent => ({ targets: {}, note: '', cards: [], log: [] });

export interface Snapshot {
  parameters: DroneParameters;
  touched: Record<string, boolean>;
  intent: DesignIntent;
}
export interface LastChange {
  path: string;
  label: string;
  from: string;
  to: string;
  at: number;
  /** 这次改动之前的状态，用来逐句比较提示词。 */
  before: Snapshot;
}
export interface Pinned extends Snapshot { label: string; at: string }

interface DroneStore extends AppState {
  task: Task;
  touched: Record<string, boolean>;
  intent: DesignIntent;
  lastChange: LastChange | null;
  history: Snapshot[];
  pinned: Pinned | null;
  /** 导出备注与最近一次导出的提示，页头和提示词面板共用。 */
  exportNote: string;
  notice: string;
  setExportNote: (note: string) => void;
  setNotice: (notice: string) => void;

  setField: (path: string, value: unknown) => void;
  clearField: (path: string) => void;
  adoptCard: (id: string) => void;
  undoCard: (id: string) => void;
  setTarget: (pair: WordPairId, pole: 'left' | 'right' | null) => void;
  setNote: (note: string) => void;
  undo: () => void;
  pin: (label: string) => void;
  unpin: () => void;
  importSnapshot: (snapshot: Snapshot) => void;
  restoreConfiguration: (parameters: DroneParameters, profile: UserProfile | null) => void;

  // 早期模型服务相关状态。本轮模型服务停用，保留字段只为旧组件仍可编译。
  useGeminiOptimization: boolean;
  isOptimizingPrompt: boolean;
  lastOptimizationResult: PromptOptimizationResult | null;
  useRAGOptimization: boolean;

  updateFrameParams: (params: Partial<FrameParameters>) => void;
  updatePropulsionParams: (params: Partial<PropulsionParameters>) => void;
  updateFuselageParams: (params: Partial<FuselageParameters>) => void;
  updateLandingGearParams: (params: Partial<LandingGearParameters>) => void;
  updateAccessoriesParams: (params: Partial<AccessoriesParameters>) => void;

  setGenerating: (isGenerating: boolean) => void;
  setCurrentImage: (image: string | null) => void;
  setError: (error: string | null) => void;
  setProgress: (progress: number) => void;
  setSelectedUserProfile: (profile: UserProfile | null) => void;
  setUseGeminiOptimization: (use: boolean) => void;
  setOptimizingPrompt: (isOptimizing: boolean) => void;
  setLastOptimizationResult: (result: PromptOptimizationResult | null) => void;
  setUseRAGOptimization: (use: boolean) => void;

  resetParameters: () => void;
  resetToDefaults: () => void;
}

/** 连续拖动同一个滑块时合并为一次改动，改动前的状态取拖动开始时。 */
const COALESCE_MS = 1500;

export function createTaskStore(task: Task) {
  const initial = structuredClone(defaultParameters);
  if (task === 'hexa') {
    initial.frame.frame_type = 'Radial Hex';
    initial.frame.wheelbase_mm = 1400;
    initial.frame.span_ratio_wl = frameRules['Radial Hex'].wl.value;
    initial.propulsion.prop_diameter_inch = 20;
  } else {
    initial.propulsion.prop_blade_count = quadBladeCount;
    initial.accessories.has_camera_gimbal = true;
  }
  const snap = (s: Snapshot): Snapshot => structuredClone({ parameters: s.parameters, touched: s.touched, intent: s.intent });

  return create<DroneStore>((set, get) => {
    /** 统一的提交入口：记历史、记“刚才的改动”，再写入新状态。 */
    const commit = (path: string, label: string, from: string, to: string, next: Partial<Snapshot>, coalesce = false) => {
      const s = get();
      const now = Date.now();
      // 只合并连续输入（拖滑块、打字）；点选项每次都算一次独立改动。
      const same = coalesce && s.lastChange !== null && s.lastChange.path === path && now - s.lastChange.at < COALESCE_MS;
      const before = same ? s.lastChange!.before : snap(s);
      set({
        ...next,
        history: same ? s.history : [...s.history, before].slice(-40),
        lastChange: { path, label, from: same ? s.lastChange!.from : from, to, at: now, before },
      });
    };
    const setField = (path: string, value: unknown) => {
      const s = get();
      const def = fieldByPath[path];
      if (!def || JSON.stringify(getPath(s.parameters, path)) === JSON.stringify(value)) return;
      let parameters = setPath(s.parameters, path, value);
      const touched = { ...s.touched, [path]: true };
      if (path === 'frame.frame_type') {
        // 换构型时 W/L 回到该构型规则的缺省值，不算设计者对 W/L 的选择。
        parameters = setPath(parameters, 'frame.span_ratio_wl', frameRules[parameters.frame.frame_type].wl.value);
        delete touched['frame.span_ratio_wl'];
      }
      const continuous = typeof value === 'number' || def.kind === 'custom';
      commit(path, def.label, def.format(s.parameters), def.format(parameters), { parameters, touched }, continuous);
    };
    const updateGroup = (group: ParameterGroup, params: object) => {
      for (const [key, value] of Object.entries(params)) {
        if (key === 'fuselage_dimensions_mm')
          for (const [dim, v] of Object.entries(value as object)) setField(`fuselage.fuselage_dimensions_mm.${dim}`, v);
        else setField(`${group}.${key}`, value);
      }
    };
    const intentChange = (path: string, label: string, from: string, to: string, intent: DesignIntent, coalesce = false) =>
      commit(path, label, from, to, { intent }, coalesce);
    const stamp = () => new Date().toISOString();

    return {
      task,
      parameters: initial,
      touched: {},
      intent: emptyIntent(),
      lastChange: null,
      history: [],
      pinned: null,
      exportNote: '界面测试（非正式实验）',
      notice: '',
      setExportNote: exportNote => set({ exportNote }),
      setNotice: notice => set({ notice }),
      isGenerating: false,
      currentImage: null,
      error: null,
      progress: 0,
      selectedUserProfile: null,
      useGeminiOptimization: false,
      isOptimizingPrompt: false,
      lastOptimizationResult: null,
      useRAGOptimization: false,

      setField,
      clearField: path => {
        const s = get();
        const def = fieldByPath[path];
        if (!def) return;
        let parameters = setPath(s.parameters, path, getPath(initial, path));
        const touched = { ...s.touched };
        delete touched[path];
        if (path === 'frame.frame_type') {
          parameters = setPath(parameters, 'frame.span_ratio_wl', frameRules[parameters.frame.frame_type].wl.value);
          delete touched['frame.span_ratio_wl'];
        }
        commit(path + '#clear', '清除「' + def.label + '」', def.format(s.parameters), def.format(parameters), { parameters, touched });
      },
      adoptCard: id => {
        const { intent } = get();
        if (intent.cards.includes(id)) return;
        intentChange('intent.cards#' + id, '采纳证据卡', '未采纳', id, {
          ...intent, cards: [...intent.cards, id], log: [...intent.log, { action: 'adopt', card: id, at: stamp() }],
        });
      },
      undoCard: id => {
        const { intent } = get();
        if (!intent.cards.includes(id)) return;
        intentChange('intent.cards#undo' + id, '撤销证据卡', id, '已撤销', {
          ...intent, cards: intent.cards.filter(c => c !== id), log: [...intent.log, { action: 'undo', card: id, at: stamp() }],
        });
      },
      setTarget: (pair, pole) => {
        const { intent } = get();
        if ((intent.targets[pair] ?? null) === pole) return;
        const targets = { ...intent.targets };
        if (pole) targets[pair] = pole; else delete targets[pair];
        const w = wordPairs.find(x => x.id === pair)!;
        const name = (v: 'left' | 'right' | null | undefined) => (v === 'left' ? w.left : v === 'right' ? w.right : '不作要求');
        intentChange('intent.targets.' + pair, `设计目标（${w.left}—${w.right}）`, name(intent.targets[pair]), name(pole), {
          ...intent, targets, log: [...intent.log, { action: 'target', pair, value: pole ?? 'none', at: stamp() }],
        });
      },
      setNote: note => {
        const { intent } = get();
        if (intent.note === note) return;
        intentChange('intent.note', '自己写的意图', intent.note || '未填写', note || '未填写', { ...intent, note }, true);
      },
      undo: () => {
        const s = get();
        const last = s.history[s.history.length - 1];
        if (!last) return;
        set({ ...snap(last), history: s.history.slice(0, -1), lastChange: null });
      },
      pin: label => set({ pinned: { ...snap(get()), label, at: stamp() } }),
      unpin: () => set({ pinned: null }),
      importSnapshot: snapshot => {
        const s = get();
        set({ ...snap(snapshot), history: [...s.history, snap(s)].slice(-40), lastChange: null });
      },
      restoreConfiguration: (parameters, selectedUserProfile) =>
        set({ parameters, selectedUserProfile, currentImage: null, error: null, lastOptimizationResult: null, lastChange: null }),

      updateFrameParams: params => updateGroup('frame', params),
      updatePropulsionParams: params => updateGroup('propulsion', params),
      updateFuselageParams: params => updateGroup('fuselage', params),
      updateLandingGearParams: params => updateGroup('landing_gear', params),
      updateAccessoriesParams: params => updateGroup('accessories', params),

      setGenerating: isGenerating => set({ isGenerating }),
      setCurrentImage: image => set({ currentImage: image }),
      setError: error => set({ error }),
      setProgress: progress => set({ progress }),
      setSelectedUserProfile: profile => set({ selectedUserProfile: profile }),
      setUseGeminiOptimization: use => set({ useGeminiOptimization: use }),
      setOptimizingPrompt: isOptimizing => set({ isOptimizingPrompt: isOptimizing }),
      setLastOptimizationResult: result => set({ lastOptimizationResult: result }),
      setUseRAGOptimization: use => set({ useRAGOptimization: use }),

      resetParameters: () => {
        const s = get();
        set({ parameters: structuredClone(initial), touched: {}, history: [...s.history, snap(s)].slice(-40), lastChange: null, currentImage: null, error: null, progress: 0 });
      },
      resetToDefaults: () => {
        const s = get();
        set({
          parameters: structuredClone(initial), touched: {}, intent: emptyIntent(), pinned: null,
          history: [...s.history, snap(s)].slice(-40), lastChange: null,
          isGenerating: false, currentImage: null, error: null, progress: 0, selectedUserProfile: null,
          useGeminiOptimization: false, isOptimizingPrompt: false, lastOptimizationResult: null, useRAGOptimization: false,
        });
      },
    };
  });
}
export const taskStores = { quad: createTaskStore('quad'), hexa: createTaskStore('hexa') };
export const DroneStoreContext = createContext(taskStores.quad);
export function useDroneStore() {
  const useBoundStore = useContext(DroneStoreContext);
  return useBoundStore();
}

// 自定义Hook，便于组件使用
export const useDroneParameters = () => {
  const store = useDroneStore();
  return {
    parameters: store.parameters,
    updateFrame: store.updateFrameParams,
    updatePropulsion: store.updatePropulsionParams,
    updateFuselage: store.updateFuselageParams,
    updateLandingGear: store.updateLandingGearParams,
    updateAccessories: store.updateAccessoriesParams,
    reset: store.resetParameters,
  };
};

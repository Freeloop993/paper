import { createContext, useContext } from 'react';
import { frameRules, layoutKey, taskLabels, quadBladeCount, type Task } from '../design/design';
import { fieldByPath, getPath, setPath, wordPairs } from '../design/fields';
import { create } from 'zustand';
import type {
  DroneParameters, AppState, FrameParameters, PropulsionParameters, FuselageParameters, LandingGearParameters,
  AccessoriesParameters, UserProfile, DesignIntent, WordPairId, ParameterGroup,
} from '../types/DroneParameters';
import type { BriefDecision } from '../design/semantics/brief';
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
/** 方案：并行探索的几个方向，各自保存一份完整状态。当前方案的状态以页面上的为准。 */
export interface Variant { id: string; name: string; snapshot: Snapshot }

interface DroneStore extends AppState {
  task: Task;
  touched: Record<string, boolean>;
  intent: DesignIntent;
  lastChange: LastChange | null;
  history: Snapshot[];
  pinned: Pinned | null;
  variants: Variant[];
  activeVariant: string;
  /** 一次改多项（画布上拖动时用），记为一次改动。 */
  setMany: (entries: [string, unknown][], label: string) => void;
  addVariant: () => void;
  switchVariant: (id: string) => void;
  removeVariant: (id: string) => void;
  /** 把任意一份参数（另一个方案、参考机型）叠在画布上对比。 */
  setGhost: (label: string, parameters: DroneParameters | null) => void;
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
  recordBrief: (entry: BriefDecision) => void;
  setMission: (mission: NonNullable<DesignIntent['taskId']>) => void;
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
  const initialIntent = () => ({...emptyIntent(), ...(task === 'hexa' ? {taskId:'agricultural_spraying' as const} : {})});
  const snap = (s: Snapshot): Snapshot => structuredClone({ parameters: s.parameters, touched: s.touched, intent: s.intent });

  const store = create<DroneStore>((set, get) => {
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
    const scopedIntent = (intent: DesignIntent, context: string): DesignIntent => ({
      ...intent, cards: [], note: '', targets: {},
      log: [...intent.log, {action:'note', at:new Date().toISOString(), value:context + '，原设计意图需重新确认。'}],
    });
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
      const intent = path === 'frame.frame_type' && layoutKey(s.parameters.frame.frame_type) !== layoutKey(parameters.frame.frame_type)
        ? scopedIntent(s.intent, '切换构型到' + frameRules[parameters.frame.frame_type].zh) : s.intent;
      commit(path, def.label, def.format(s.parameters), def.format(parameters), { parameters, touched, intent }, continuous);
    };
    const setMany = (entries: [string, unknown][], label: string) => {
      const s = get();
      let parameters = s.parameters;
      const touched = { ...s.touched };
      const names: string[] = [];
      for (const [path, value] of entries) {
        const def = fieldByPath[path];
        if (!def || JSON.stringify(getPath(parameters, path)) === JSON.stringify(value)) continue;
        parameters = setPath(parameters, path, value);
        touched[path] = true;
        names.push(`${def.label} ${def.format(parameters)}`);
      }
      if (names.length) commit('drag:' + label, label, '', names.join('，'), { parameters, touched }, true);
    };
    /** 把页面上的状态存回当前方案。 */
    const stash = (s: DroneStore): Variant[] => s.variants.map(v => (v.id === s.activeVariant ? { ...v, snapshot: snap(s) } : v));
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
      intent: initialIntent(),
      lastChange: null,
      history: [],
      pinned: null,
      variants: [{ id: 'A', name: '方案 A', snapshot: structuredClone({ parameters: initial, touched: {}, intent: initialIntent() }) }],
      activeVariant: 'A',
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
      setMany,
      addVariant: () => {
        const s = get();
        const used = new Set(s.variants.map(v => v.id));
        const id = 'ABCDEFGH'.split('').find(c => !used.has(c));
        if (!id) return;
        set({ variants: [...stash(s), { id, name: '方案 ' + id, snapshot: snap(s) }], activeVariant: id, lastChange: null });
      },
      switchVariant: id => {
        const s = get();
        const target = s.variants.find(v => v.id === id);
        if (!target || id === s.activeVariant) return;
        set({ ...snap(target.snapshot), variants: stash(s), activeVariant: id, history: [], lastChange: null, pinned: s.pinned && s.pinned.label === target.name ? null : s.pinned });
      },
      removeVariant: id => {
        const s = get();
        if (s.variants.length < 2) return;
        const rest = stash(s).filter(v => v.id !== id);
        if (id !== s.activeVariant) { set({ variants: rest }); return; }
        set({ ...snap(rest[0].snapshot), variants: rest, activeVariant: rest[0].id, history: [], lastChange: null });
      },
      setGhost: (label, parameters) => set({ pinned: parameters ? { parameters: structuredClone(parameters), touched: {}, intent: emptyIntent(), label, at: stamp() } : null }),
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
        const intent = path === 'frame.frame_type' && layoutKey(parameters.frame.frame_type) !== layoutKey(s.parameters.frame.frame_type)
          ? scopedIntent(s.intent, '恢复默认构型') : s.intent;
        commit(path + '#clear', '清除「' + def.label + '」', def.format(s.parameters), def.format(parameters), { parameters, touched, intent });
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
      setMission: mission => {
        const { intent } = get();
        const old = intent.taskId ?? 'consumer_camera';
        if (mission !== old) {
          intentChange('intent.taskId','更换使用任务',taskLabels[old],taskLabels[mission],
            {...scopedIntent(intent, '切换任务到' + taskLabels[mission]), taskId:mission});
        }
      },
      recordBrief: entry => {
        const { intent } = get();
        const apply = entry.action === 'accept' || entry.action === 'custom';
        const note = apply ? entry.text : entry.action === 'revoke' ? '' : intent.note;
        const cards = entry.action === 'accept' ? entry.evidence.filter(e => e.role === 'example').map(e => e.id)
          : apply || entry.action === 'revoke' ? [] : intent.cards;
        intentChange('intent.brief', '设计者确认依据', intent.note, note, {
          ...intent, note, cards, log: [...intent.log, {action:'brief', at:entry.at, brief:entry}],
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
        const restored = snap(last);
        if (JSON.stringify(restored.intent) !== JSON.stringify(s.intent)) {
          restored.intent.log = [...s.intent.log, {action:'undo', at:stamp(),
            value:'恢复简报 · '+(restored.intent.note || '未指定意图')+' · 依据 '+(restored.intent.cards.join('、') || '无')}];
        }
        set({ ...restored, history: s.history.slice(0, -1), lastChange: null });
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
        set({ parameters: structuredClone(initial), intent:layoutKey(initial.frame.frame_type) !== layoutKey(s.parameters.frame.frame_type) ? scopedIntent(s.intent,'重置构型') : s.intent, touched: {}, history: [...s.history, snap(s)].slice(-40), lastChange: null, currentImage: null, error: null, progress: 0 });
      },
      resetToDefaults: () => {
        const s = get();
        set({
          parameters: structuredClone(initial), touched: {}, intent: {...emptyIntent(),taskId:s.intent.taskId}, pinned: null,
          history: [...s.history, snap(s)].slice(-40), lastChange: null,
          isGenerating: false, currentImage: null, error: null, progress: 0, selectedUserProfile: null,
          useGeminiOptimization: false, isOptimizingPrompt: false, lastOptimizationResult: null, useRAGOptimization: false,
        });
      },
    };
  });
  // 只保存在本地的设计草稿。模型回执和候选原图单独保存。
  if (typeof window !== 'undefined') {
    const key = 'multirotor-studio/draft-v1/' + task;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw && !window.location.hash.includes('cfg=')) {
        const saved = JSON.parse(raw) as Pick<DroneStore, 'parameters'|'intent'|'touched'|'variants'|'activeVariant'|'exportNote'>;
        if (saved.parameters?.frame?.frame_type in frameRules && Array.isArray(saved.intent?.log) &&
            Array.isArray(saved.intent?.cards) && saved.variants?.some(v => v.id === saved.activeVariant)) {
          store.setState({parameters:saved.parameters, intent:saved.intent, touched:saved.touched,
            variants:saved.variants, activeVariant:saved.activeVariant, exportNote:saved.exportNote});
        }
      }
    } catch { store.setState({notice:'本地草稿无法恢复，可从已导出的规格重新载入。'}); }
    let saveFailed = false;
    store.subscribe(s => {
      try {
        const data = { ...snap(s), variants:s.variants, activeVariant:s.activeVariant, exportNote:s.exportNote };
        window.localStorage.setItem(key, JSON.stringify(data));
        saveFailed = false;
      } catch {
        if (!saveFailed) { saveFailed = true; store.setState({notice:'浏览器未保存当前草稿，请导出规格。'}); }
      }
    });
  }
  return store;
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

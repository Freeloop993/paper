import { create } from 'zustand';
import type { DroneParameters, AppState, FrameParameters, PropulsionParameters, FuselageParameters, LandingGearParameters, AccessoriesParameters, UserProfile } from '../types/DroneParameters';
import type { PromptOptimizationResult } from '../services/geminiPromptOptimizer';

// 默认参数值
const defaultFrameParams: FrameParameters = {
  frame_type: 'True X',
  wheelbase_mm: 250,
  arm_thickness_mm: '4mm',
  arm_width_mm: '15mm',
  material_visual: 'Carbon Fiber'
};

const defaultPropulsionParams: PropulsionParameters = {
  prop_diameter_inch: 5.0,
  prop_blade_count: '3叶',
  motor_tilt_degree: 0
};

const defaultFuselageParams: FuselageParameters = {
  fuselage_style: 'Minimalist Plate',
  fuselage_dimensions_mm: {
    length: 100,
    width: 80,
    height: 30
  }
};

const defaultLandingGearParams: LandingGearParameters = {
  landing_gear_style: '低矮滑撬/支腿',
  landing_gear_height_mm: 40
};

const defaultAccessoriesParams: AccessoriesParameters = {
  has_camera_gimbal: false,
  custom_prompt_additions: '',
  drone_primary_color: '#0ea5e9'
};

const defaultParameters: DroneParameters = {
  frame: defaultFrameParams,
  propulsion: defaultPropulsionParams,
  fuselage: defaultFuselageParams,
  landing_gear: defaultLandingGearParams,
  accessories: defaultAccessoriesParams
};

interface DroneStore extends AppState {
  // 新增：Gemini优化相关状态
  useGeminiOptimization: boolean;
  isOptimizingPrompt: boolean;
  lastOptimizationResult: PromptOptimizationResult | null;
  
  // 新增：RAG优化相关状态
  useRAGOptimization: boolean;
  
  // 更新方法
  updateFrameParams: (params: Partial<FrameParameters>) => void;
  updatePropulsionParams: (params: Partial<PropulsionParameters>) => void;
  updateFuselageParams: (params: Partial<FuselageParameters>) => void;
  updateLandingGearParams: (params: Partial<LandingGearParameters>) => void;
  updateAccessoriesParams: (params: Partial<AccessoriesParameters>) => void;
  
  // 应用状态更新方法
  setGenerating: (isGenerating: boolean) => void;
  setCurrentImage: (image: string | null) => void;
  setError: (error: string | null) => void;
  setProgress: (progress: number) => void;
  setSelectedUserProfile: (profile: UserProfile | null) => void;
  
  // 新增：Gemini优化相关方法
  setUseGeminiOptimization: (use: boolean) => void;
  setOptimizingPrompt: (isOptimizing: boolean) => void;
  setLastOptimizationResult: (result: PromptOptimizationResult | null) => void;
  
  // 新增：RAG优化相关方法
  setUseRAGOptimization: (use: boolean) => void;
  
  // 重置方法
  resetParameters: () => void;
  resetToDefaults: () => void;
}

export const useDroneStore = create<DroneStore>((set, get) => ({
  // 初始状态
  parameters: defaultParameters,
  isGenerating: false,
  currentImage: null,
  error: null,
  progress: 0,
  selectedUserProfile: null,
  
  // 新增：Gemini优化初始状态
  useGeminiOptimization: true, // 默认启用Gemini优化
  isOptimizingPrompt: false,
  lastOptimizationResult: null,

  // 新增：RAG优化初始状态
  useRAGOptimization: false,

  // 参数更新方法
  updateFrameParams: (params) => set((state) => ({
    parameters: {
      ...state.parameters,
      frame: { ...state.parameters.frame, ...params }
    }
  })),

  updatePropulsionParams: (params) => set((state) => ({
    parameters: {
      ...state.parameters,
      propulsion: { ...state.parameters.propulsion, ...params }
    }
  })),

  updateFuselageParams: (params) => set((state) => ({
    parameters: {
      ...state.parameters,
      fuselage: { 
        ...state.parameters.fuselage, 
        ...params,
        // 处理嵌套的dimensions对象
        fuselage_dimensions_mm: params.fuselage_dimensions_mm 
          ? { ...state.parameters.fuselage.fuselage_dimensions_mm, ...params.fuselage_dimensions_mm }
          : state.parameters.fuselage.fuselage_dimensions_mm
      }
    }
  })),

  updateLandingGearParams: (params) => set((state) => ({
    parameters: {
      ...state.parameters,
      landing_gear: { ...state.parameters.landing_gear, ...params }
    }
  })),

  updateAccessoriesParams: (params) => set((state) => ({
    parameters: {
      ...state.parameters,
      accessories: { ...state.parameters.accessories, ...params }
    }
  })),

  // 应用状态更新方法
  setGenerating: (isGenerating) => set({ isGenerating }),
  setCurrentImage: (image) => set({ currentImage: image }),
  setError: (error) => set({ error }),
  setProgress: (progress) => set({ progress }),
  setSelectedUserProfile: (profile) => set({ selectedUserProfile: profile }),

  // 新增：Gemini优化相关方法
  setUseGeminiOptimization: (use) => set({ useGeminiOptimization: use }),
  setOptimizingPrompt: (isOptimizing) => set({ isOptimizingPrompt: isOptimizing }),
  setLastOptimizationResult: (result) => set({ lastOptimizationResult: result }),

  // 新增：RAG优化相关方法
  setUseRAGOptimization: (use) => set({ useRAGOptimization: use }),

  // 重置方法
  resetParameters: () => set({ 
    parameters: defaultParameters,
    currentImage: null,
    error: null,
    progress: 0,
    lastOptimizationResult: null
  }),

  resetToDefaults: () => set({
    parameters: defaultParameters,
    isGenerating: false,
    currentImage: null,
    error: null,
    progress: 0,
    selectedUserProfile: null,
    useGeminiOptimization: true,
    isOptimizingPrompt: false,
    lastOptimizationResult: null,
    useRAGOptimization: false
  })
}));

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
    reset: store.resetParameters
  };
}; 
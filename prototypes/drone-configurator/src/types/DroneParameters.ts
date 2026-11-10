// 机架参数类型
export interface FrameParameters {
  frame_type: 'True X' | 'Wide X' | 'Stretch X' | 'H-Frame' | 'Deadcat' | '+ Configuration';
  wheelbase_mm: number; // 100-500mm
  arm_thickness_mm: '3mm' | '4mm' | '5mm' | '6mm';
  arm_width_mm: '10mm' | '15mm' | '20mm';
  material_visual: 'Carbon Fiber' | 'Aluminum' | 'ABS Plastic' | 'PLA Plastic';
}

// 动力系统参数类型
export interface PropulsionParameters {
  prop_diameter_inch: number; // 3-10 inches
  prop_blade_count: '2叶' | '3叶' | '4叶' | '5叶' | '6叶';
  motor_tilt_degree: number; // 0-20 degrees
}

// 机身参数类型
export interface FuselageParameters {
  fuselage_style: 'Exposed Stack' | 'Minimalist Plate' | 'Aerodynamic Pod' | 'Boxy Enclosure';
  fuselage_dimensions_mm: {
    length: number; // 50-300mm
    width: number;  // 30-200mm
    height: number; // 20-150mm
  };
}

// 起落架参数类型
export interface LandingGearParameters {
  landing_gear_style: '无独立起落架' | '低矮滑撬/支腿' | '高脚起落架';
  landing_gear_height_mm: number; // 20-100mm
}

// 配件参数类型
export interface AccessoriesParameters {
  has_camera_gimbal: boolean;
  custom_prompt_additions: string;
  drone_primary_color: string;
}

// 用户画像类型
export type UserProfile = '新手玩家' | '摄影爱好者' | '户外/亲子用户';

// 用户画像详细信息
export interface UserProfileInfo {
  name: UserProfile;
  description: string;
  icon: string;
  characteristics: string[];
  optimizationFocus: string[];
}

// 完整的无人机参数类型
export interface DroneParameters {
  frame: FrameParameters;
  propulsion: PropulsionParameters;
  fuselage: FuselageParameters;
  landing_gear: LandingGearParameters;
  accessories: AccessoriesParameters;
}

// API请求和响应类型
export interface GenerateImageRequest {
  parameters: DroneParameters;
}

export interface GenerateImageResponse {
  success: boolean;
  image_url?: string;
  image_base64?: string;
  error?: string;
  progress?: number;
}

// 应用状态类型
export interface AppState {
  parameters: DroneParameters;
  isGenerating: boolean;
  currentImage: string | null;
  error: string | null;
  progress: number;
  selectedUserProfile: UserProfile | null;
} 
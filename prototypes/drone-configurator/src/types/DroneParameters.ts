// 机架参数类型
export interface FrameParameters {
  frame_type: 'True X' | 'Wide X' | 'Stretch X' | 'H-Frame' | 'Deadcat' | '+ Configuration' | 'Radial Hex';
  /** 设计值：两条对角电机中心距的均值 D（mm）。另导出任意两轴最大距。 */
  wheelbase_mm: number; // 100-500mm
  /** 轴心横向跨度 / 纵向跨度。真 X 固定 1.00；宽 X、伸展 X、H 型可调；Deadcat、十字由规则算出。 */
  span_ratio_wl: number;
  arm_thickness_mm: '3mm' | '4mm' | '5mm' | '6mm';
  arm_width_mm: '10mm' | '15mm' | '20mm';
  /** 空字符串表示留白，由设计者后续决定。 */
  material_visual: '' | 'Carbon Fiber' | 'Aluminum' | 'ABS Plastic' | 'PLA Plastic';
  /** 臂根过渡。空字符串表示留白。 */
  arm_root: '' | 'seamless' | 'socket' | 'hinge';
}

// 动力系统参数类型
export interface PropulsionParameters {
  prop_diameter_inch: number; // 3-10 inches
  prop_blade_count: '2叶' | '3叶' | '4叶' | '5叶' | '6叶';
  motor_tilt_degree: number; // 0-20 degrees
  /** 桨叶护圈必须由设计者明确选择，模板不会自行添加。 */
  prop_guard: 'none' | 'ring';
}

// 机身参数类型
export interface FuselageParameters {
  /** 机身轮廓。空字符串表示留白。Exposed Stack / Minimalist Plate 为早期选项，仅为读取旧配置保留。 */
  fuselage_style: '' | 'Exposed Stack' | 'Minimalist Plate' | 'Aerodynamic Pod' | 'Boxy Enclosure' | 'Faceted Compact';
  /** 顶盖分件。空字符串表示留白。 */
  top_cover: '' | 'single' | 'two' | 'multi';
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
  /** 相机安装方式。空字符串表示留白。相机朝机头前方是任务固定条件。 */
  camera_mount: '' | 'flush' | 'underslung';
  custom_prompt_additions: string;
  /** 主色。空字符串表示留白。 */
  drone_primary_color: string;
  /** 表面处理。空字符串表示留白。 */
  surface_finish: '' | 'matte' | 'satin';
}

// 用户画像类型（早期版本的展示材料，现行界面不再用它推定颜色或材质）
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

export type ParameterGroup = keyof DroneParameters;

/** 设计意图：由设计者提出。证据卡只作依据，不改参数。 */
export type WordPairId = 'compact' | 'simple' | 'integrated' | 'visible';
export interface IntentLogEntry {
  action: 'adopt' | 'undo' | 'target' | 'note';
  card?: string;
  pair?: WordPairId;
  value?: string;
  at: string;
}
export interface DesignIntent {
  /** 每组词对想靠近哪一极；未出现表示不作要求。 */
  targets: Partial<Record<WordPairId, 'left' | 'right'>>;
  /** 设计者自己写的意图。没有合适证据卡时只填这一项即可。 */
  note: string;
  /** 已采纳为依据的证据卡号。 */
  cards: string[];
  /** 采纳、撤销与目标变更的先后记录。 */
  log: IntentLogEntry[];
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

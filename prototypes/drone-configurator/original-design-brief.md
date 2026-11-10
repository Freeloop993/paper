# React前端开发：无人机造型参数化AI生图应用

## 1. 项目初始化与基本设置 (Vite + TypeScript + Tailwind CSS)

"使用Vite创建一个新的React项目，命名为 `drone_configurator_ui`。集成TypeScript作为主要编程语言。配置项目以使用Tailwind CSS进行样式化，并确保ESLint和Prettier已设置用于代码规范和格式化。"

## 2. 核心UI布局与导航

"设计并实现应用的主布局。顶部应包含一个应用标题 '交互式无人机造型参数化AI生图'。下方应有一个清晰的导航区域（例如，选项卡式导航或侧边栏），允许用户在不同的参数设置区域（如机架、动力系统、机身、起落架、配件）和图像展示区域之间切换。主内容区域将根据导航选择动态显示相应内容。底部应有一个页脚，包含版权信息。"
"确保整体色调采用平静和谐的风格，以Slate背景和Sky蓝色调作为强调色，符合之前SPA示例的视觉风格。"

## 3. 参数控制面板组件开发

"为以下无人机设计参数类别创建独立的React组件，每个组件包含相应的输入控件。所有输入控件的值都需要被状态管理起来，并在用户交互时更新。"

### 3.1 机架参数 (FrameParameters.tsx)
    - "实现一个名为 `FrameParameters` 的组件。"
    - "包含一个下拉菜单 (Dropdown) 用于选择 **机架类型/风格 (frame_type)**。选项包括：'真X型 (True X)', '宽X型 (Wide X)', '伸展X型 (Stretch X)', 'H型 (H-Frame)', 'Deadcat型 (Deadcat)', '十字型 (+ Configuration)'。" [1, 2]
    - "包含一个滑块 (Slider) 用于调整 **轴距/尺寸 (wheelbase_mm)**，范围100mm到500mm，步长1mm。实时显示当前值。" [3, 4, 5]
    - "包含一个下拉菜单用于选择 **机臂厚度 (arm_thickness_mm)**，选项：'3mm', '4mm', '5mm', '6mm'。" [4, 2]
    - "包含一个下拉菜单用于选择 **机臂宽度 (arm_width_mm)**，选项：'10mm', '15mm', '20mm'。"
    - "包含一个下拉菜单用于选择 **材料 (视觉暗示) (material_visual)**，选项：'碳纤维 (Carbon Fiber)', '铝合金 (Aluminum)', 'ABS塑料 (ABS Plastic)', 'PLA塑料 (PLA Plastic)'。此参数主要用于生成文本提示词。" [6, 7, 2, 8]

### 3.2 动力系统参数 (PropulsionParameters.tsx)
    - "实现一个名为 `PropulsionParameters` 的组件。"
    - "包含一个滑块用于调整 **螺旋桨直径 (prop_diameter_inch)**，范围3英寸到10英寸，步长0.1英寸。" [9, 10, 11]
    - "包含一个下拉菜单用于选择 **螺旋桨叶片数量 (prop_blade_count)**，选项：'2叶', '3叶', '4叶', '5叶', '6叶'。" [10, 11, 12, 13]
    - "包含一个滑块用于调整 **电机安装倾角 (motor_tilt_degree)**，范围0度到20度，步长1度。" [14, 15]

### 3.3 机身/主体参数 (FuselageParameters.tsx)
    - "实现一个名为 `FuselageParameters` 的组件。"
    - "包含一个下拉菜单用于选择 **机身/座舱盖样式 (fuselage_style)**，选项：'裸露堆叠 (Exposed Stack)', '极简平板 (Minimalist Plate)', '流线型座舱 (Aerodynamic Pod)', '方正机壳 (Boxy Enclosure)'。" [4, 16, 17]
    - "包含滑块用于调整 **机身尺寸 (fuselage_dimensions_mm)** (如果选择了非裸露样式): 长 (length, 50-300mm), 宽 (width, 30-200mm), 高 (height, 20-150mm)。" [3, 18]

### 3.4 起落架参数 (LandingGearParameters.tsx)
    - "实现一个名为 `LandingGearParameters` 的组件。"
    - "包含一个下拉菜单用于选择 **起落架样式 (landing_gear_style)**，选项：'无独立起落架', '低矮滑撬/支腿', '高脚起落架'。" [6, 19, 20]
    - "包含一个滑块用于调整 **起落架高度 (landing_gear_height_mm)** (如果选择了非无样式)，范围20mm到100mm。" [19, 20]

### 3.5 配件与视觉参数 (AccessoriesParameters.tsx)
    - "实现一个名为 `AccessoriesParameters` 的组件。"
    - "包含一个复选框 (Checkbox) 用于控制 **是否包含相机/云台 (has_camera_gimbal)**。" [21, 22, 5, 23]
    - "包含一个文本输入框用于用户输入 **附加文本提示词 (custom_prompt_additions)**，用于补充ComfyUI的生成提示。"
    - "包含一个颜色选择器 (ColorPicker) 用于选择 **无人机主色调 (drone_primary_color)** (用于文本提示词)。"

## 4. 状态管理

"使用React Context API (或Zustand，如果更倾向于轻量级全局库) 来管理所有无人机参数的全局状态。确保当用户在任何参数组件中修改输入时，全局状态能相应更新。"
"创建一个 `useDroneParameters` 自定义Hook，方便组件访问和修改参数状态。"

## 5. API交互与图像生成触发

"在主控制区域实现一个 '生成图像 (Generate Image)' 按钮。"
"点击按钮时，收集当前所有无人机参数的全局状态，并使用Axios (或TanStack Query的mutation) 向后端API (例如 `/api/generate-drone-image`) 发送一个POST请求，请求体包含所有参数的JSON对象。"
"在API请求期间，按钮应变为禁用状态，并显示加载指示器 (例如，在按钮旁边显示一个旋转图标，或在图像预览区显示加载状态)。"

## 6. 图像展示与反馈

"在主内容区域的特定部分 (例如，一个专门的'图像结果'选项卡或固定区域) 实现图像展示功能。"
"当后端API成功返回生成的图像URL或Base64图像数据时，在此区域显示图像。"
"如果API请求失败或ComfyUI生成过程中发生错误，应在此区域或通过通知组件向用户显示清晰的错误信息。"
"如果后端能够通过WebSocket提供生成进度，尝试在UI上显示一个进度条或百分比。"

## 7. 输入防抖与验证 (可选，但推荐)

"为滑块等高频输入的参数调整实现防抖 (debounce) 逻辑，延迟API请求的发送，直到用户停止操作一段时间 (例如500ms)。"
"为关键数值输入 (如轴距不能小于螺旋桨直径之和的两倍等) 添加简单的前端验证逻辑，并在不满足条件时给出提示。"

## 8. 响应式设计与组件库集成

"确保所有组件和整体布局都是响应式的，能在桌面和移动设备上良好显示 (利用Tailwind CSS的响应式断点)。"
"如果选择使用UI组件库 (如Ant Design或MUI)，确保所有自定义参数组件都基于该库的组件进行构建，以保持视觉风格的统一性。"

## 9. 附加功能

"实现一个 '重置参数 (Reset Parameters)' 按钮，点击后将所有参数恢复到预设的默认值。"

---

**给Cursor的额外指令:**

*   "请为每个主要功能块 (如参数面板、API服务、状态管理) 创建清晰的文件结构和模块。"
*   "在关键的逻辑部分添加注释，解释代码意图。"
*   "优先考虑代码的可读性和可维护性。"
*   "后端API端点和确切的参数名称可能需要根据后端实现进行调整，暂时使用占位符或上述建议名称。"
*   "对于WebSocket的集成，如果前端直接处理，请说明；如果由后端中继，则前端只需处理后端推送的进度和结果信息。"

---
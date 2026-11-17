# C1 选择面板

直接打开 `public/c1-pilot/index.html` 即可操作。宿主先加载同目录的 `selection.css`、普通 defer 脚本 `selection.js`，再加载宿主脚本。脚本不需要模块服务器、模型或网络，沿用当前 CSP（图片允许 `data:`）。面板、预览、提示词传三个互不包含的容器；后两个可省，仍可从快照读布局和完整提示词。

```js
const editor = window.C1Selection.mount({
  panel: selectionElement,
  preview: sidebarElement,
  prompt: promptElement,
  studyLayout: isStructuredStudy, // 自由试配为 false 或省略
  initialSelection: savedSelection || {},
  onChange(s) {
    // 首次同步触发。此时 editor 尚未赋值，请直接用 s。
    sessionStorage.setItem(draftKey, JSON.stringify(s.selection));
    confirmButton.disabled = !s.validation.ok;
  }
});
const s = editor.getSnapshot();
editor.setSelection({ root: "socket", camera: "inside" }); // 同步更新并返回新快照
const version = await editor.exportVersion();              // uav-configurator-e/2
editor.destroy();                                          // 换场次或卸载前调用
```

- `selection` 只包含显式选择。给某字段传 `null` 恢复继承；部件的 `"open"` 是有意留白。配置起点 A/B/C 用原 `directionDraft`，改变起点保留单项覆盖。所有可选键和值见同目录 `c1Model.ts` 的 `labels/options`。
- `snapshot` 含 `selection/research/layout/prompt/validation`；输入非法时布局为 null、提示词为空，导出 Promise 拒绝。选择、轴距滑动、精确输入均同步回调；切页或查看定位图不记录选择。每次挂载相互独立，模块本身不写存储。
- 页签支持方向键、Home、End；原生单选支持方向键和空格。自由试配从“构型”开始，预试 S 从“部件”开始。结构预览的 W/L 是轴心的横/纵跨度，不含叶尖，也不是最大中心距；弧是 R1→R2 的实际夹角。结构视图自动取景不改变导出画幅。
- 研究记录在 `version.draft.inputs.c1Selection`，随当前宿主的 `inputs` 入档。每字段记录 value、source（selected/default/preset/task）、active、open。原 E 草案要求填写的云台布尔值及起落架参数不等于参与者选择；未启用的组不送入部件提示词。相机默认只约束朝向，研究模式另要求位于机头端，不规定支架。
- `studyLayout:true` 在恢复、程序补丁和 UI 上强制 True X、250 mm、等角、仅轴心和机架连线；这些字段始终不写入 `selection`，实际角度同时记录于 `research.taskLayout`。共同图沿用 `form342` 的画幅比例和 `reference.png` 原始字节，SHA-256 为 `15c5ad1c924b8e1c46ae4ffe59c4f7785e8ff5c130f9000432821410b1fd1338`。自由版继续使用 `layoutFor/compile/versions.freeze` 生成当前 PNG，两种模式均有完整提示词、摘要和 top-layout 引用。
- 旧 ZIP 只沿用四个四旋夹角预设。坐标统一使用 E 的毫米、机头向上、固定导出比例。可自定义径向 X / H 的夹角；命名构型与夹角定义冲突时须改回“随构型”或切换构型。几何校验是出图校验，不是飞行性能评估。

从 E 项目根目录，用现有锁定依赖、Node 22+ 和本机 Chrome 运行：

```powershell
node src/design/c1Bundle.mjs
node src/design/c1Bundle.mjs --check
node src/design/c1Selftest.mjs
```

自测可传入 Chrome / Edge 可执行文件路径。先在隔离挂载点检查输入边界、研究锁定、W/L 与弧、两个实例、PNG 与提示词摘要；随后在全新临时浏览器配置中打开真实宿主，操作试配、刷新还原和预试 S 封存。不使用真实场次库，不调用生成服务。浏览器禁用 GPU，只通过本机回环端口调试。


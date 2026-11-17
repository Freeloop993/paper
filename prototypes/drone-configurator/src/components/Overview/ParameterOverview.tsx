// 造型规格卡：把当前选择整理成一张卡（字段与论文规格卡对应），并从这里导出。
import React, { useMemo, useRef } from 'react';
import { ClipboardList, Download, FileJson, FileText, Image as ImageIcon, Upload, Zap } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout, frameRules } from '../../design/design';
import { fieldByPath, getPath, openDecisions, wordPairs } from '../../design/fields';
import { buildExport, canvasPngBytes, download, exportAll, fileNames, fileStamp, guideCanvas, parseImported } from '../../design/exporters';
import { sha256Bytes } from '../../design/sha256';
import { GuideView } from '../DevPreview/InterfacePreview';

const styling = ['fuselage.fuselage_style', 'fuselage.top_cover', 'frame.arm_root', 'frame.material_visual', 'accessories.camera_mount', 'accessories.drone_primary_color', 'accessories.surface_finish'];

const Row: React.FC<{ label: string; children: React.ReactNode; muted?: boolean }> = ({ label, children, muted }) => (
  <div className="flex gap-3 border-b border-slate-100 py-2 last:border-0">
    <dt className="w-20 shrink-0 text-sm text-slate-500">{label}</dt>
    <dd className={`min-w-0 flex-1 text-sm ${muted ? 'text-slate-500' : 'text-slate-900'}`}>{children}</dd>
  </div>
);

const ParameterOverview: React.FC = () => {
  const { parameters, touched, intent, pinned, lastChange, importSnapshot, exportNote, setExportNote, notice, setNotice } = useDroneStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const layout = useMemo(() => computeLayout(parameters), [parameters]);
  const { frame, propulsion, fuselage, landing_gear: gear, accessories } = parameters;
  const size = fuselage.fuselage_dimensions_mm;
  const targets = wordPairs.filter(w => intent.targets[w.id]).map(w => (intent.targets[w.id] === 'left' ? w.left : w.right));
  const decided = styling.filter(p => getPath(parameters, p) !== '' && (p !== 'accessories.camera_mount' || accessories.has_camera_gimbal));
  const open = openDecisions(parameters);

  const state = { parameters, touched, intent };
  const options = { note: exportNote, pinned, lastChange: lastChange && { path: lastChange.path, label: lastChange.label, from: lastChange.from, to: lastChange.to } };
  const all = () => { const c = exportAll(state, options); setNotice(`已导出：${c.files.guide}、${c.files.prompt}、${c.files.config}`); };
  const one = (kind: 'config' | 'prompt' | 'guide') => {
    const stamp = fileStamp(), names = fileNames(stamp);
    const png = canvasPngBytes(guideCanvas(layout));
    const config = buildExport(state, { ...options, stamp, guideSha256: sha256Bytes(png) });
    if (kind === 'guide') download(names.guide, png, 'image/png');
    if (kind === 'prompt') download(names.prompt, config.prompt.text, 'text/plain;charset=utf-8');
    if (kind === 'config') download(names.config, JSON.stringify(config, null, 2), 'application/json');
    setNotice(`已导出：${names[kind]}`);
  };
  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try { importSnapshot(parseImported(JSON.parse(await file.text()), parameters)); setNotice(`已读入 ${file.name}`); }
    catch (e) { setNotice('读入失败：' + (e instanceof Error ? e.message : String(e))); }
    if (fileInput.current) fileInput.current.value = '';
  };
  const small = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-primary-500 hover:text-primary-700';

  return (
    <section className="card" aria-label="造型规格卡" data-testid="spec-card">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-slate-900">造型规格卡</h3>
        <span className="text-sm text-slate-400">Spec Card</span>
      </div>

      <dl className="mt-3">
        <Row label="使用任务" muted>日常随行航拍四旋翼 · 展开正交顶视，机头朝上</Row>
        <Row label="设计意图">
          {targets.length || intent.note.trim()
            ? <>{targets.join('、')}{targets.length > 0 && intent.note.trim() && '；'}{intent.note.trim()}</>
            : <span className="text-slate-500">未提出</span>}
          <span className="ml-2 text-slate-500">依据：{intent.cards.length ? intent.cards.join('、') : targets.length || intent.note.trim() ? '设计者判断' : '—'}</span>
        </Row>
        <Row label="构型">{frameRules[frame.frame_type].zh} · 轴距 {frame.wheelbase_mm} mm · 横纵比 {layout.W_over_L.toFixed(2)}</Row>
        <Row label="机臂">宽 {parseInt(frame.arm_width_mm, 10)} mm · 厚 {parseInt(frame.arm_thickness_mm, 10)} mm</Row>
        <Row label="桨">
          {propulsion.prop_diameter_inch} 英寸 · 每副 {parseInt(propulsion.prop_blade_count, 10)} 叶 · {propulsion.prop_guard === 'ring' ? '环形护圈' : '无护圈'}
          {propulsion.motor_tilt_degree > 0 && ` · 倾角 ${propulsion.motor_tilt_degree}°`}
        </Row>
        <Row label="机身">{size.length} × {size.width} × {size.height} mm（长 × 宽 × 高）</Row>
        <Row label="相机">{accessories.has_camera_gimbal ? '机头前视相机，朝正前方' : '不装相机'}</Row>
        <Row label="起落架">{gear.landing_gear_style}{gear.landing_gear_style !== '无独立起落架' && ` · 离地 ${gear.landing_gear_height_mm} mm`}</Row>
        <Row label="已定造型">
          {decided.length ? decided.map(p => `${fieldByPath[p].label} ${fieldByPath[p].format(parameters)}`).join('；') : <span className="text-slate-500">还没有指定</span>}
        </Row>
        <Row label="自由项">
          {open.length
            ? <span data-testid="free-items">{open.map(f => f.label).join('、')}<span className="ml-1 text-slate-500">（未指定，留给后续设计）</span></span>
            : <span className="text-slate-500" data-testid="free-items">无</span>}
        </Row>
        {accessories.custom_prompt_additions.trim() && <Row label="补充描述">{accessories.custom_prompt_additions.trim()}</Row>}
      </dl>

      <div className="mt-4 flex gap-4 rounded-lg bg-slate-50 p-3">
        <GuideView layout={layout} className="h-24 w-24 shrink-0 rounded-md" />
        <div className="min-w-0 text-sm text-slate-600">
          <p className="font-medium text-slate-900">导出三件，交给出图一方</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">条件图 PNG（1024×1024）、提示词 TXT、规格 JSON，文件名带同一个时间。规格 JSON 以后还能读回来接着改。</p>
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            备注
            <input value={exportNote} onChange={e => setExportNote(e.target.value)} aria-label="导出备注"
              className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-700 focus:border-primary-500 focus:outline-none" />
          </label>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={all} className="btn-primary inline-flex items-center gap-2" data-testid="export-all"><Download className="h-4 w-4" />导出三件</button>
        <button type="button" onClick={() => one('guide')} className={small} data-testid="export-guide"><ImageIcon className="h-4 w-4" />条件图</button>
        <button type="button" onClick={() => one('prompt')} className={small} data-testid="export-prompt"><FileText className="h-4 w-4" />提示词</button>
        <button type="button" onClick={() => one('config')} className={small} data-testid="export-config"><FileJson className="h-4 w-4" />规格 JSON</button>
        <button type="button" onClick={() => fileInput.current?.click()} className={small} data-testid="import-config"><Upload className="h-4 w-4" />读入规格</button>
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" data-testid="import-input" onChange={e => onImport(e.target.files?.[0])} />
      </div>
      {notice && <p className="mt-2 text-sm text-emerald-700" role="status" data-testid="notice">{notice}</p>}

      <div className="mt-4 flex items-center gap-3 border-t border-slate-200 pt-4">
        <button type="button" disabled className="btn-secondary inline-flex shrink-0 items-center gap-2 whitespace-nowrap opacity-50"><Zap className="h-4 w-4" />生成图像</button>
        <p className="text-xs text-slate-500">模型服务未接入。现阶段导出后由出图一方生成，回图上的比例另行量测。</p>
      </div>
    </section>
  );
};

export default ParameterOverview;

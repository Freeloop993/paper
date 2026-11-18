// 几何与提示词的自动复核。运行：npm run verify（需要 Node 22.18 以上，直接读取 TypeScript 源文件）。
// 检查的是界面实际使用的同一份 computeLayout / compilePrompt，不另写一套算法。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { computeLayout, layoutExport, frameRules } from '../src/design/design.ts';
import { compilePrompt, diffSentences, auditPrompt } from '../src/design/partPrompt.ts';
import { openDecisions } from '../src/design/fields.ts';
import { buildExport, parseImported } from '../src/design/exporters.ts';

const here = dirname(fileURLToPath(import.meta.url));
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? '通过' : '失败'}  ${name}${detail ? '  —  ' + detail : ''}`); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const base = () => ({
  frame: { frame_type: 'True X', wheelbase_mm: 250, span_ratio_wl: 1, arm_thickness_mm: '4mm', arm_width_mm: '15mm', material_visual: '', arm_root: '' },
  propulsion: { prop_diameter_inch: 5, prop_blade_count: '2叶', motor_tilt_degree: 0, prop_guard: 'none' },
  fuselage: { fuselage_style: '', top_cover: '', fuselage_dimensions_mm: { length: 100, width: 80, height: 30 } },
  landing_gear: { landing_gear_style: '低矮滑撬/支腿', landing_gear_height_mm: 40 },
  accessories: { has_camera_gimbal: true, camera_mount: '', custom_prompt_additions: '', drone_primary_color: '', surface_finish: '' },
});
const withFrame = (type, extra = {}) => { const p = base(); p.frame.frame_type = type; p.frame.span_ratio_wl = frameRules[type].wl.value; Object.assign(p.frame, extra); return p; };
const noIntent = { targets: {}, note: '', cards: [], log: [] };
const prompt = (p, touched = {}, intent = noIntent) => compilePrompt(p, touched, intent, computeLayout(p));

// 1. 真 X 与宽 X：同一设计轴距下 W/L 不同，D 均值相同
const tx = computeLayout(withFrame('True X')), wx = computeLayout(withFrame('Wide X'));
check('真 X 的 W/L 为 1.00', near(tx.W_over_L, 1, 1e-9), tx.W_over_L.toFixed(4));
check('宽 X 的 W/L 为 1.30，与真 X 不同', near(wx.W_over_L, 1.3, 1e-9) && !near(wx.W_over_L, tx.W_over_L, 0.05), wx.W_over_L.toFixed(4));
check('两者对角距均值都等于设计值 250 mm', near(tx.D_mean_mm, 250, 1e-9) && near(wx.D_mean_mm, 250, 1e-9));
check('真 X 相邻夹角 90·90·90·90', tx.adjacent_deg.every(a => near(a, 90, 1e-9)));
check('宽 X 相邻夹角可由坐标复算', (() => {
  const a = 2 * Math.atan(1.3) * 180 / Math.PI;
  return near(wx.adjacent_deg[0], a, 1e-6) && near(wx.adjacent_deg[1], 180 - a, 1e-6);
})(), wx.adjacent_deg.map(a => a.toFixed(2)).join('·'));

// 2. 导出像素坐标与已登记的研究条件图相符（guides.json 的 centers_px 为取整值）
const guides = JSON.parse(readFileSync(resolve(here, '../public/research-guides/guides.json'), 'utf8'));
for (const [type, wl] of [['Stretch X', 0.7], ['True X', 1.0], ['Wide X', 1.3]]) {
  const g = guides.find(x => x.wl === wl && x.dd === 0.5);
  const mine = computeLayout(withFrame(type)).hubs.map(h => [h.x_px, h.y_px]);
  const worst = Math.max(...mine.map(([x, y]) => Math.min(...g.centers_px.map(([u, v]) => Math.hypot(x - u, y - v)))));
  check(`${type}（W/L ${wl.toFixed(2)}）四个轴心与研究条件图 ${g.file} 相差不超过 1 px`, worst <= 1, `最大偏差 ${worst.toFixed(3)} px`);
}

// 3. Deadcat：四个可辨轴心；另按“最大两轴距 = 250”复算研究方案里记的 242.55
const dc = computeLayout(withFrame('Deadcat'));
const pairs = dc.hubs.flatMap((a, i) => dc.hubs.slice(i + 1).map(b => Math.hypot(a.x_mm - b.x_mm, a.y_mm - b.y_mm)));
check('Deadcat 有四个轴心', dc.hubs.length === 4);
check('Deadcat 四个轴心两两相距大于 100 mm', Math.min(...pairs) > 100, `最近 ${Math.min(...pairs).toFixed(1)} mm`);
check('Deadcat 前后各两个、左右对称', dc.hubs.filter(h => h.y_mm > 0).length === 2 && near(dc.hubs[0].x_mm, -dc.hubs[1].x_mm, 1e-9) && near(dc.hubs[3].x_mm, -dc.hubs[2].x_mm, 1e-9));
check('Deadcat：D 均值 250 时最大两轴距可复算', near(dc.max_pair_mm, Math.max(...pairs), 1e-9), `最大两轴距 ${dc.max_pair_mm.toFixed(2)} mm`);
check('Deadcat：若改按最大两轴距 250 缩放，对角距均值为 242.55（与研究方案所记一致）', near(250 * dc.D_mean_mm / dc.max_pair_mm, 242.55, 0.01), (250 * dc.D_mean_mm / dc.max_pair_mm).toFixed(3));
check('Deadcat 相邻夹角之和为 360°', near(dc.adjacent_deg.reduce((s, v) => s + v, 0), 360, 1e-9), dc.adjacent_deg.map(a => a.toFixed(1)).join('·'));

// 4. 所有构型：轴心数、夹角闭合、画幅内
for (const type of Object.keys(frameRules)) {
  const l = computeLayout(withFrame(type));
  const inside = l.hubs.every(h => h.x_px > 20 && h.x_px < 1004 && h.y_px > 20 && h.y_px < 1004);
  check(`${type}：${frameRules[type].hubs} 个轴心、夹角闭合、落在 1024 画幅内`, l.hubs.length === frameRules[type].hubs && near(l.adjacent_deg.reduce((s, v) => s + v, 0), 360, 1e-6) && inside);
}

// 5. 只把臂宽 10 → 20：提示词恰好一句变化，且两句分别含 10 mm、20 mm
const p10 = base(); p10.frame.arm_width_mm = '10mm';
const p20 = base(); p20.frame.arm_width_mm = '20mm';
const d = diffSentences(prompt(p10).sentences, prompt(p20).sentences);
check('臂宽 10→20 只改写一句', d.changed.length === 1 && d.added.length === 0 && d.removed.length === 0, d.changed.map(c => c.id).join(','));
check('改写的是机臂尺寸句，前后分别写 10 mm 与 20 mm', d.changed[0]?.id === 'arm_size' && /\b10 mm wide/.test(d.changed[0].before) && /\b20 mm wide/.test(d.changed[0].after));
const e20 = buildExport({ parameters: p20, touched: { 'frame.arm_width_mm': true }, intent: noIntent }, { note: 'verify', stamp: 'verify' });
check('JSON 的臂宽与提示词同值', e20.parameters.frame.arm_width_mm === '20mm' && e20.prompt.text.includes('20 mm wide') && e20.selection_status.find(s => s.path === 'frame.arm_width_mm').status === 'chosen');
const l10 = layoutExport(computeLayout(p10)), l20 = layoutExport(computeLayout(p20));
check('臂宽不改变轴心坐标', JSON.stringify(l10.hubs) === JSON.stringify(l20.hubs));

// 6. 默认状态：模板不自行加入护圈、颜色、碳纹；留白项不成句
const def = prompt(base());
const a0 = auditPrompt(base(), def.sentences);
check('默认状态下护圈、颜色、碳纹均未出现', a0.every(a => a.status === 'absent'), a0.map(a => `${a.label}:${a.status}`).join(' '));
check('默认状态下 7 个造型项留白且不成句', openDecisions(base()).length === 7 && !def.sentences.some(s => ['arm_root', 'arm_material', 'body_style', 'top_cover', 'camera_mount', 'colour', 'finish'].includes(s.id)));
check('默认提示词不含 guard（否定句除外）、carbon、#色号', !/carbon|#[0-9a-f]{6}/i.test(def.text) && def.text.split('\n').filter(l => /guard/i.test(l)).every(l => l === 'No propeller guards.'));

// 7. 全组合扫描：任何选择组合下自检都不出现“模板自行加入”
let combos = 0, unexpected = 0;
for (const type of ['True X', 'Wide X', 'Deadcat', 'H-Frame'])
  for (const material of ['', 'Carbon Fiber', 'Aluminum'])
    for (const guard of ['none', 'ring'])
      for (const colour of ['', '#f97316'])
        for (const style of ['', 'Aerodynamic Pod', 'Faceted Compact'])
          for (const mount of ['', 'flush', 'underslung'])
            for (const camera of [true, false]) {
              const p = withFrame(type, { material_visual: material });
              p.propulsion.prop_guard = guard; p.accessories.drone_primary_color = colour; p.fuselage.fuselage_style = style;
              p.accessories.camera_mount = mount; p.accessories.has_camera_gimbal = camera;
              const s = prompt(p).sentences;
              const audit = auditPrompt(p, s);
              combos++;
              if (audit.some(a => a.status === 'unexpected')) unexpected++;
              const expect = { guard: guard === 'ring' ? 'selected' : 'absent', colour: colour ? 'selected' : 'absent', carbon: material === 'Carbon Fiber' ? 'selected' : 'absent' };
              if (audit.some(a => a.status !== expect[a.topic])) unexpected++;
            }
check(`${combos} 种选择组合：护圈、颜色、碳纹只在被选中时出现`, unexpected === 0, `异常 ${unexpected}`);

// 8. 证据卡采纳与撤销不改参数、不改布局；目标写入提示词，撤销后恢复原文
const adopted = { targets: { compact: 'left' }, note: '', cards: ['E001'], log: [] };
const withCard = buildExport({ parameters: base(), touched: {}, intent: adopted }, { note: 'verify', stamp: 'verify' });
const without = buildExport({ parameters: base(), touched: {}, intent: noIntent }, { note: 'verify', stamp: 'verify' });
check('采纳证据卡后参数与轴心不变', JSON.stringify(withCard.parameters) === JSON.stringify(without.parameters) && JSON.stringify(withCard.layout) === JSON.stringify(without.layout));
check('采纳的卡号与目标进入配置', withCard.intent.adopted_cards[0].id === 'E001' && withCard.intent.targets[0].pole === '紧凑' && withCard.intent.origin === '证据卡 + 设计者');
check('目标成为提示词中单独一句，撤销后该句消失', withCard.prompt.sentences.some(s => s.id === 'intent') && !without.prompt.sentences.some(s => s.id === 'intent'));
const own = buildExport({ parameters: base(), touched: {}, intent: { targets: {}, note: '机臂到机身的过渡连续', cards: [], log: [] } }, { note: 'verify', stamp: 'verify' });
check('无证据卡时可自写意图，记为设计者自定', own.intent.origin === '设计者自定（未采纳证据卡）' && own.prompt.text.includes('机臂到机身的过渡连续'));

// Exercise independent task/layout fields through export and reimport, including the coaxial side supplement.
const layoutCases = [
  ['True X', 4, 1, 'quadcopter'], ['Radial Tri', 3, 1, 'tricopter'],
  ['Radial Hex', 6, 1, 'flat hexacopter'], ['Radial Octo', 8, 1, 'flat octocopter'],
  ['Coax Y6', 3, 2, 'coaxial Y6 hexacopter'], ['Coax X8', 4, 2, 'coaxial X8 octocopter'],
];
const missions = { consumer_camera: 'everyday carry-along aerial photography',
  agricultural_spraying: 'civil agricultural crop care', neutral_design: 'a civilian industrial design comparison' };
for (const [frame, axes, layers, aircraftName] of layoutCases) {
  for (const [taskId, purpose] of Object.entries(missions)) {
    const state = { parameters: withFrame(frame), touched: {}, intent: { ...noIntent, taskId } };
    const bundle = buildExport(state, { note: '', stamp: 'test' });
    const reopened = parseImported(bundle, base());
    const checkPrefix = `Design a ${aircraftName} for ${purpose}.`;
    const validScale = axes === 3
      ? bundle.layout.D_mean_mm === null && bundle.layout.d_over_D_mean === null
        && near(bundle.layout.reference_span_mm, bundle.layout.max_pair_distance_mm, .001)
      : near(bundle.layout.D_mean_mm, state.parameters.frame.wheelbase_mm, .001);
    const side = bundle.supplementary_view;
    check(`${taskId} / ${frame} 实发文字、轴位、层数、尺度与重导入一致`,
      bundle.task_id === taskId && reopened.intent.taskId === taskId && reopened.parameters.frame.frame_type === frame
      && bundle.layout.hubs.length === axes && bundle.topology.rotor_count === axes * layers
      && bundle.topology.layers_per_axis === layers && bundle.prompt.text.startsWith(checkPrefix) && validScale
      && (layers === 1 ? side === null : side?.linked_top_layout_sha256 === bundle.reference_image.layout_sha256
        && side.sha256.length === 64 && bundle.prompt.text.includes('lower layer may be occluded'))
      && buildExport(reopened, { note: '', stamp: 'test' }).prompt.text_sha256 === bundle.prompt.text_sha256);
  }
}
const storageText = '折起来能放进背包';
const storageIntent = { ...noIntent, note: storageText, log: [{ action: 'brief',
  brief: { action: 'accept', text: storageText, query: { state: 'folded' } } }] };
const storage = buildExport({parameters: base(), intent: storageIntent, touched: {}}, {note: '', stamp: 'test'});
check('折叠意图保留在简报，展开顶视输入不混入收纳原话', storage.intent.designer_note === storageText && !storage.prompt.text.includes(storageText));

const failed = results.filter(r => !r.ok);
console.log(`\n共 ${results.length} 项，通过 ${results.length - failed.length}，失败 ${failed.length}`);
process.exit(failed.length ? 1 : 0);

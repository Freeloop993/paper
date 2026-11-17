// 导出：配置 JSON、提示词文本和点线条件图。三者出自同一份状态和同一组轴心。
import type { DesignIntent, DroneParameters } from '../types/DroneParameters.ts';
import { computeLayout, drawGuide, layoutExport, wlBasis, type Layout } from './design.ts';
import {
  diffParameters, fields, fieldStatus, groupLabel, isRelevant, openDecisions, references, statusLabel, taskFixed,
  visibilityLabel, wordPairs,
} from './fields.ts';
import { auditPrompt, compilePrompt, sourceLabel } from './partPrompt.ts';
import { sha256Bytes, sha256Text } from './sha256.ts';
import evidence from '../data/evidenceCards.json' with { type: 'json' };

export const APP_VERSION = '2.0.0-interface-round1';
export const SCHEMA = 'drone-configurator/config-v2';

export interface ExportState {
  parameters: DroneParameters;
  touched: Record<string, boolean>;
  intent: DesignIntent;
}
export interface ExportOptions {
  note: string;
  stamp: string;
  pinned?: (ExportState & { label: string; at: string }) | null;
  lastChange?: { path: string; label: string; from: string; to: string } | null;
  guideSha256?: string | null;
}

export const fileStamp = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};
export const fileNames = (stamp: string) => ({
  config: `drone-config-${stamp}.json`, prompt: `drone-prompt-${stamp}.txt`, guide: `drone-guide-${stamp}.png`,
});

const basisText = { definition: '几何定义', experimental: '实验档位', designer: '设计者输入' } as const;

export function buildExport(state: ExportState, options: ExportOptions) {
  const { parameters, touched, intent } = state;
  const layout = computeLayout(parameters);
  const prompt = compilePrompt(parameters, touched, intent, layout);
  const geometry = layoutExport(layout);
  const names = fileNames(options.stamp);
  const cards = evidence.cards.filter(c => intent.cards.includes(c.id));
  const targets = wordPairs.filter(w => intent.targets[w.id]).map(w => ({
    pair: `${w.left}—${w.right}`, pole: intent.targets[w.id] === 'left' ? w.left : w.right, origin: '设计者提出',
  }));
  const pinned = options.pinned ?? null;
  return {
    schema: SCHEMA,
    app: { name: '无人机造型配置器（五页签）', version: APP_VERSION },
    exported_at: new Date().toISOString(),
    export_note: options.note,
    files: names,
    model_service: { status: 'disabled', note: '模型生图与向量检索均停用。本文件只含设计输入，不含任何生成结果。' },
    task_fixed: taskFixed,
    intent: {
      origin: cards.length ? '证据卡 + 设计者' : targets.length || intent.note.trim() ? '设计者自定（未采纳证据卡）' : '未声明',
      targets,
      designer_note: intent.note.trim(),
      adopted_cards: cards.map(c => ({ id: c.id, quote: c.quote, object: c.object, state: c.state, polarity: c.polarity, limits: c.limits, relation: c.relation })),
      log: intent.log,
      evidence_source: { path: evidence.source, sha256: evidence.sha256, card_count: evidence.card_count, source_count: evidence.source_count, note: evidence.note },
      rule: '证据卡只作为提出目标的依据；采纳或撤销都不会改动任何参数。',
    },
    parameters,
    selection_status: fields.filter(f => isRelevant(f, parameters)).map(f => {
      const status = fieldStatus(f, parameters, touched);
      return { path: f.path, group: groupLabel[f.group], label: f.label, value: f.format(parameters), status, status_zh: statusLabel[status], top_view: visibilityLabel[f.visibility] };
    }),
    open_decisions: openDecisions(parameters).map(f => ({ path: f.path, label: f.label, note: '留白：由设计者后续决定，未写入提示词。' })),
    layout: geometry,
    value_sources: {
      wheelbase_mm: touched['frame.wheelbase_mm'] ? '设计者输入' : '默认值（250 mm 为论文规格卡的实验设定）',
      span_ratio_wl: basisText[wlBasis(parameters.frame)],
      frame_geometry: basisText[layout.basis],
      prop_diameter: touched['propulsion.prop_diameter_inch'] ? '设计者输入' : '默认值',
      body_dimensions: '设计者输入或默认值；是包络尺寸，不是外形',
      reference_tables: references.sources,
      note: '毫米数均为设计值。厂商公布值、手册图面量测值只作对照，不会自动写入参数。',
    },
    reference_image: {
      type: geometry.guide.type, role: '布局参考（首次按参数设计）', file: names.guide, size: layout.guide.size, nose: '机头朝上',
      source: `${APP_VERSION} computeLayout`, layout_sha256: layoutDigest(layout), png_sha256: options.guideSha256 ?? null,
      parent_image: null, parent_note: '未登记父图：模型服务停用，本轮没有可沿用的候选图。',
    },
    prompt: {
      file: names.prompt,
      text: prompt.text,
      text_sha256: sha256Text(prompt.text),
      sentences: prompt.sentences.map((s, i) => ({ n: i + 1, id: s.id, source: s.source, source_zh: sourceLabel[s.source], about: s.zh, text: s.text, fields: s.fields })),
      template_audit: auditPrompt(parameters, prompt.sentences),
    },
    measured_from_output: { status: '无', note: '生成图上的轴心、比例和造型档位须在回图后另行量测或判读；本文件没有这类读数。' },
    comparison: pinned ? {
      label: pinned.label, pinned_at: pinned.at,
      parameter_diff: diffParameters(pinned.parameters, parameters),
      layout_before: (({ W_over_L, D_mean_mm, max_pair_distance_mm, adjacent_deg, hubs }) => ({ W_over_L, D_mean_mm, max_pair_distance_mm, adjacent_deg, hubs }))(layoutExport(computeLayout(pinned.parameters))),
    } : null,
    last_change: options.lastChange ?? null,
  };
}
export type ConfigExport = ReturnType<typeof buildExport>;

/** 条件图内容摘要：由轴心与连接线的像素坐标算出，不依赖浏览器的 PNG 编码。 */
export function layoutDigest(layout: Layout) {
  const g = layoutExport(layout);
  return sha256Text(JSON.stringify({ hubs: g.hubs.map(h => [h.id, h.x_px, h.y_px]), links: g.links_px }));
}

export function guideCanvas(layout: Layout) {
  const canvas = document.createElement('canvas');
  drawGuide(canvas, layout);
  return canvas;
}
export function canvasPngBytes(canvas: HTMLCanvasElement) {
  const b64 = canvas.toDataURL('image/png').split(',')[1];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
export function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.download = name;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 一次导出三件：点线图、提示词、配置。三个文件共用同一个时间戳。 */
export function exportAll(state: ExportState, options: Omit<ExportOptions, 'stamp' | 'guideSha256'>) {
  const stamp = fileStamp();
  const names = fileNames(stamp);
  const layout = computeLayout(state.parameters);
  const png = canvasPngBytes(guideCanvas(layout));
  const config = buildExport(state, { ...options, stamp, guideSha256: sha256Bytes(png) });
  download(names.guide, png, 'image/png');
  download(names.prompt, config.prompt.text, 'text/plain;charset=utf-8');
  download(names.config, JSON.stringify(config, null, 2), 'application/json');
  return config;
}

/** 读回本程序导出的配置；只取参数、意图与选择状态，其余字段重新计算。缺少的新字段用当前默认值补齐。 */
export function parseImported(raw: unknown, defaults: DroneParameters): ExportState {
  const data = raw as Partial<ConfigExport> & { parameters?: DroneParameters };
  if (!data || typeof data !== 'object' || !data.parameters?.frame) throw new Error('不是本配置器导出的配置文件。');
  const src = data.parameters;
  const parameters: DroneParameters = {
    frame: { ...defaults.frame, ...src.frame },
    propulsion: { ...defaults.propulsion, ...src.propulsion },
    fuselage: {
      ...defaults.fuselage, ...src.fuselage,
      fuselage_dimensions_mm: { ...defaults.fuselage.fuselage_dimensions_mm, ...src.fuselage?.fuselage_dimensions_mm },
    },
    landing_gear: { ...defaults.landing_gear, ...src.landing_gear },
    accessories: { ...defaults.accessories, ...src.accessories },
  };
  const touched: Record<string, boolean> = {};
  for (const s of data.selection_status ?? []) if (s.status === 'chosen') touched[s.path] = true;
  const targets: DesignIntent['targets'] = {};
  for (const t of data.intent?.targets ?? []) {
    const pair = wordPairs.find(w => `${w.left}—${w.right}` === t.pair);
    if (pair) targets[pair.id] = t.pole === pair.left ? 'left' : 'right';
  }
  return {
    parameters,
    touched,
    intent: {
      targets, note: data.intent?.designer_note ?? '',
      cards: (data.intent?.adopted_cards ?? []).map(c => c.id), log: data.intent?.log ?? [],
    },
  };
}

export const stateLabels: Record<string, string> = {
  unspecified: '尚未指定', folded: '折叠收纳', carrying: '随身携带', unfolded_top: '展开俯视', with_accessory: '加装配件',
};
export function suggestFields(text: string) {
  const unfolded = /展开|俯视|unfold|top view/i.test(text);
  const folded = /折叠|折起|折好|收起|\bfold(?:s|ed|ing)?\b/i.test(text);
  const state = unfolded && folded ? 'unspecified' : unfolded ? 'unfolded_top' : folded ? 'folded'
    : /加装|装上|加了/i.test(text) ? 'with_accessory' : /背包|口袋|衣兜|裤兜|小包|书包|装包|放进包|pocket|bag/i.test(text) ? 'carrying' : 'unspecified';
  let topic = '';
  if (/口袋|衣兜|裤兜|pocket/i.test(text)) topic = 'pocket_fit';
  else if (/背包|包内|小包|书包|入包|装包|放进包|bag|backpack/i.test(text)) topic = 'bag_fit';
  else if (/云台.*(?:保护罩|护罩)|gimbal cover/i.test(text)) topic = 'gimbal_cover';
  else if (/云台.*(?:橙|颜色|点色)/.test(text)) topic = 'accent_color';
  else if (/(?:桨保|护圈|护桨).*(?:厚|薄)/.test(text)) topic = 'guard_thickness';
  else if (/色标|[Aa][Bb].*标记|标记.*[Aa][Bb]/.test(text)) topic = 'assembly_mark';
  else if (/贴皮|贴膜|贴纸|覆膜|反光条纹|reflective|wrap|skin/i.test(text)) topic = 'wrap';
  else if (/(颜色|配色).*(材料|材质)|(材料|材质).*(颜色|配色)/.test(text)) topic = 'color_material';
  else if (/配件.*(?:内置|集成|内藏)|(?:内置|集成).*配件/.test(text)) topic = 'accessory_integration';
  else if (/保护罩|护罩|护圈|桨保/.test(text)) topic = state === 'with_accessory' ? 'accessory_outline' : 'blade_guard';
  else if (/紧凑|小巧|舒展|compact|便携/.test(text)) topic = 'compactness';
  else if (/简洁|简约/.test(text)) topic = 'simplicity';
  else if (/鲜艳|醒目|辨识/.test(text)) topic = 'color_recognition';
  else if (/颜色|配色/.test(text)) topic = 'color_preference';
  return { state, topic };
}

import type { LookupResult } from './lookup.mjs';

export interface BriefDecision {
  action: 'accept' | 'custom' | 'reject' | 'revoke' | 'reference';
  part?: import('../../types/DroneParameters').ParameterGroup;
  text: string;
  at: string;
  reason: string;
  query: LookupResult['query'];
  status: LookupResult['status'];
  sourceVersion: string;
  corpus: string;
  evidence: { id: string; source: string; role: string }[];
  hypotheses: string[];
}

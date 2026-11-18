export const stateLabels: Record<string, string> = {
  unspecified: '尚未指定', folded: '折叠收纳', carrying: '随身携带', unfolded_top: '展开俯视', with_accessory: '加装配件',
};
export function suggestFields(text: string) {
  const unfolded = /展开|俯视|unfold|top view/i.test(text);
  const folded = /折叠|折起|折好|\bfold(?:ed|ing)?\b/i.test(text);
  const state = unfolded && folded ? 'unspecified' : unfolded ? 'unfolded_top' : folded ? 'folded'
    : /加装|装上|加了/i.test(text) ? 'with_accessory' : /背包|口袋|小包|放进包|pocket|bag/i.test(text) ? 'carrying' : 'unspecified';
  let topic = '';
  if (/口袋|pocket/i.test(text)) topic = 'pocket_fit';
  else if (/背包|包内|小包|入包|放进包|bag|backpack/i.test(text)) topic = 'bag_fit';
  else if (/保护罩|护罩|护圈|桨保/.test(text)) topic = state === 'with_accessory' ? 'accessory_outline' : 'blade_guard';
  else if (/紧凑|小巧|舒展|compact|便携/.test(text)) topic = 'compactness';
  else if (/简洁|简约/.test(text)) topic = 'simplicity';
  else if (/鲜艳|醒目|辨识/.test(text)) topic = 'color_recognition';
  else if (/颜色|配色/.test(text)) topic = 'color_preference';
  return { state, topic };
}

import type { LookupResult } from './lookup.mjs';

export interface BriefDecision {
  action: 'accept' | 'custom' | 'reject' | 'revoke';
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

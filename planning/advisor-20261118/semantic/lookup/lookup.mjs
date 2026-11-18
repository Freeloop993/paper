import { layouts, states, task, topics, version, widthHypothesis } from "./topics.mjs";

const fields = ["id", "source_key", "record", "dataset", "quote", "object", "state", "category", "polarity", "limits", "relation"];
const contentDigest = "fad47dff187388251c19f9083b813cf4cc61e165f56626a12b861684f9dec6f3";

export function vocabulary() {
  return {
    version, task, layouts: [...layouts], states: [...states],
    topics: Object.entries(topics).map(([id, entry]) => ({
      id, label: entry.label,
      states: Object.entries(entry.byState).map(([state, route]) => ({ state, component: route.component ?? entry.component }))
    }))
  };
}

// 建立一次，后续同步查询。不改调用者的简报、证据卡、参数或提示词。
export async function createLookup(envelope) {
  if (!Array.isArray(envelope?.cards)) throw new Error("缺少 cards 数组。");
  const cards = envelope.cards.map(card => Object.fromEntries(fields.map(key => [key, card[key]])));
  cards.sort((a, b) => a.id.localeCompare(b.id));
  const canonical = JSON.stringify(cards.map(card => fields.map(key => card[key])));
  const signature = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  const digest = Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, "0")).join("");
  if (digest !== contentDigest) throw new Error("该卡表的内容与已标注的 36 张公开卡不一致。");
  const byId = new Map(cards.map(card => [card.id, card]));

  return function lookup({ task: selectedTask, layout, topic, state, component }) {
    const query = { task: selectedTask, layout, topic, state, component };
    const base = {
      version, corpus: digest, query, scope: "消费航拍来源的陈述；个别卡的对象和使用情境以原卡为准。构型特有机制尚无标注。",
      groups: [], hypotheses: [], parameterChanges: []
    };
    const stop = (status, reason, choices = []) => ({
      ...base, status, reason, choices, choiceField: choices.length ? "state" : null
    });
    if (!selectedTask || !layout) return stop("clarify", "请先指明使用任务和目标构型。");
    if (selectedTask !== task) return stop("abstain", "当前卡库只覆盖消费航拍相关的用户表达。请保留该任务自己的设计意图。");
    if (layout !== "general" && layout !== "quad") {
      return stop("abstain", "此构型没有标注过的对应来源。请保留设计意图，补充该构型的材料。");
    }
    if (!topic) return stop("clarify", "请选择要设计的部位或话题。");
    if (!Object.hasOwn(topics, topic)) return stop("abstain", "当前卡表没有登记这个话题。");
    const definition = topics[topic];

    if (!state) return stop("clarify", "请指定观察或使用状态。", Object.keys(definition.byState));
    if (!states.includes(state)) return stop("abstain", "该状态尚未登记。");
    if (!Object.hasOwn(definition.byState, state)) {
      if (state === "unspecified") return stop("clarify", "请确认适用的观察或使用状态。", Object.keys(definition.byState));
      return stop("abstain", "该话题现有原句未覆盖选定状态。");
    }
    const entry = definition.byState[state];
    const targetComponent = entry.component ?? definition.component;
    if (component && component !== targetComponent) return stop("abstain", "选定状态下，话题对应的部位与所选部位不同。");
    const groups = new Map();
    const status = entry.status ?? "retrieve";
    for (const id of [...entry.cards, ...(entry.cautions ?? [])]) {
      const card = byId.get(id);
      if (!groups.has(card.source_key)) groups.set(card.source_key, { source: card.source_key, cards: [] });
      const role = entry.cautions?.includes(id) ? "caution" : status === "clarify" ? "context" : "example";
      groups.get(card.source_key).cards.push({ ...card, role });
    }
    const hypotheses = topic === "compactness" && state === "unfolded_top" && layout === "quad" ? [{ ...widthHypothesis }] : [];
    return {
      ...base, component: targetComponent, status, reason: entry.reason, groups: [...groups.values()], hypotheses,
      choices: [...(entry.options ?? [])], choiceField: entry.options ? entry.choiceField ?? "state" : null
    };
  };
}

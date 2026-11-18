// 目标卡片和目标面板共用的编辑逻辑：同一段草稿文字、同一组检索条件、同一次确认。
import { useState } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { layoutKey } from '../../design/design';
import { suggestFields } from '../../design/semantics/brief';
import { decisionSources, useEvidenceLibrary } from '../../design/semantics/evidenceLibrary';
import { useCanvasUi } from '../Canvas/canvasUi';

export type GoalAction = 'accept' | 'custom' | 'reject' | 'revoke';

export function useGoalEditor() {
  const { parameters, intent, recordBrief, activeVariant } = useDroneStore();
  const { goalText: text, setGoalText, goalChoice, setGoalChoice } = useCanvasUi();
  const [feedback, setFeedback] = useState('');
  const mission = intent.taskId ?? 'consumer_camera';
  const frame = parameters.frame.frame_type;
  const history = intent.log.flatMap(item => item.brief ? [item.brief] : []);
  const previous = [...history].reverse().find(row => ['accept', 'custom'].includes(row.action) && row.text === intent.note
    && row.query.task === mission && row.query.layout === layoutKey(frame));
  // 话题和使用状态默认按文字推断；回到已保存的目标时沿用当时确认的检索条件。设计者改过的条件只对当前这段文字有效。
  const inferred = suggestFields(text);
  const defaults = previous && text === intent.note
    ? { topic: previous.query.topic === 'unmapped' ? '' : previous.query.topic, state: previous.query.state } : inferred;
  const mine = goalChoice.text === text ? goalChoice : { text };
  const topic = mine.topic ?? defaults.topic, state = mine.state ?? defaults.state;
  const { library, error } = useEvidenceLibrary();
  const query = { task: mission, layout: layoutKey(frame), topic: topic || 'unmapped', state };
  const result = library?.lookup(query);
  const inputText = text.trim();

  function apply(action: GoalAction, reason = '') {
    const at = new Date().toISOString();
    if (action === 'revoke' && previous) recordBrief({ ...previous, action, at, reason: reason.trim() });
    else recordBrief({ action, reason: reason.trim(), text: action === 'revoke' ? intent.note : inputText, at, ...decisionSources(query, result) });
    setFeedback(action === 'reject' ? '已记录驳回理由。' : action === 'revoke' ? '已撤销设计目标。' : '已保存到方案 ' + activeVariant + '。');
  }
  return {
    text, inputText, mission, frame, topic, state, query, result, library, error, previous, history, feedback,
    unsaved: inputText !== intent.note.trim(),
    setText: (value: string) => { setGoalText(value); setFeedback(''); },
    setTopic: (value: string) => { setGoalChoice({ ...mine, topic: value }); setFeedback(''); },
    setState: (value: string) => { setGoalChoice({ ...mine, state: value }); setFeedback(''); },
    chooseTopic: (id: string, label: string) => {
      const next = inputText ? text : label;
      if (!inputText) setGoalText(next);
      setGoalChoice({ text: next, topic: id }); setFeedback('');
    },
    clearFeedback: () => setFeedback(''),
    apply,
  };
}

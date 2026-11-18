import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createDesignService } from './design-chat.mjs';
import { createDesignServer } from './design-chat-server.mjs';

const context = { task:'consumer_camera', frame:'True X', layout:'quad', part:'fuselage', view:'top',
  widthMm:80, brief:'折叠之后容易放进小包', topic:'bag_fit', state:'folded' };
const input = (message, overrides = {}) => ({ message, context: { ...context, ...overrides } });
const failIfCalled = () => { throw new Error('This check only permits local evidence retrieval.'); };
const softwareModel = (answer, suggestion = null) => createDesignService({
  apiKey:'isolated-test', fetchImpl: async () => Response.json({
    id:'fixture', choices:[{ finish_reason:'stop', message:{ content:JSON.stringify({answer,suggestion}) } }],
  }),
});

test('an unrelated question cannot borrow the brief topic, including on a following question', async () => {
  const {evidence} = await createDesignService({fetchImpl:failIfCalled});
  const first = input('这款的续航时间怎样？');
  for (const question of [first, {...input('那有什么依据呢？'),history:[{role:'user',content:first.message}]}]) {
    const result = evidence(question);
    assert.equal(result.sources.length, 0);
    assert.notEqual(result.retrieval.status,'retrieve');
  }
});

test('references can reuse a prior topic, but keep folded and unfolded commentary distinct', async () => {
  const {evidence} = await createDesignService({fetchImpl:failIfCalled});
  const question = input('那证据呢？', {brief:'展开俯视的紧凑感',topic:'compactness',state:'unfolded_top'});
  question.history = [{role:'user',content:'折叠后能否装进小包？'}];
  const matched=evidence(question);
  assert.deepEqual(matched.retrieval.branches[0].ids,['E009','E008']);
  assert.equal(matched.retrieval.branches[0].state,'folded');
  const comparison = evidence(input('对照折叠和展开顶视时的紧凑感'));
  assert.deepEqual(comparison.retrieval.branches.map(b=>[b.state,b.status]),[['folded','retrieve'],['unfolded_top','abstain']]);
});

test('retrieval reports independent sources, dataset fingerprint and matched/cited roles', async () => {
  const {chat,evidence} = await softwareModel('E003 提供一个携带例子。');
  const sample = input('这个口袋能放下吗？');
  const local=evidence(sample);
  assert.deepEqual(local.sources.map(c=>c.id),['E003','E004']);
  assert.equal(local.sources[0].source,local.sources[1].source);
  assert.equal(local.retrieval.sourceCount,1);
  assert.match(local.retrieval.corpus,/^[\da-f]{64}$/);
  assert.ok(local.retrieval.version && local.retrieval.scope);
  assert.ok(local.sources.every(c=>!c.cited));
  const result = await chat(sample);
  assert.deepEqual(result.citedIds,['E003']);
  assert.deepEqual(result.sources.map(c=>c.cited),[true,false]);
  assert.equal(result.mode,'model');
});

test('mismatched card ids and explicitly attributed invented quotations do not become an answer', async () => {
  const question = input('问一下口袋能否装下？');
  for (const reply of ['见 E999。','E003「这不是卡片中的原句」']) {
    const {chat} = await softwareModel(reply);
    await assert.rejects(chat(question), e => e.code === 'invalid_model_output' && e.metadata.sources.every(c=>!c.cited));
  }
  const {chat} = await softwareModel('E003「tank bag」是原句片段。');
  assert.deepEqual((await chat(question)).citedIds,['E003']);
});

test('a legal slider value still has to match the requested target, unit and direction', async () => {
  const question = input('请把机身宽度从80 mm 调到9厘米，保持轴位。');
  const suggestion = to => ({field:'bodyWidthMm',from:80,to,reason:'同视图比较'});
  const {chat:wrong} = await softwareModel('可以试做对照。',suggestion(70));
  await assert.rejects(wrong(question), e=>e.code==='invalid_model_output');
  await assert.rejects(wrong(input('请把机身调宽一点。')), e=>e.code==='invalid_model_output');
  const {chat:right} = await softwareModel('这是尚待比较的调整。',suggestion(90));
  assert.equal((await right(question)).suggestion.to,90);
  await assert.rejects(wrong(input('请试调机身宽度，改到90毫米。')), e=>e.code==='invalid_model_output');
  await assert.rejects(wrong(input('请把机身加宽10毫米。')), e=>e.code==='invalid_model_output');
  assert.equal((await right(input('请把机身加宽10毫米。'))).suggestion.to,90);
  assert.equal((await right(input('只解释机身宽度，不需要改动。'))).suggestion,null);
});

test('the same-origin HTTP evidence endpoint works without credentials and never calls a model', async t => {
  let calls=0;
  const {chat,evidence} = await createDesignService({fetchImpl:()=>{calls++;return failIfCalled();}});
  const server=createDesignServer(chat,evidence);
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin='http://127.0.0.1:'+server.address().port;
  const post=path=>fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},
    body:JSON.stringify(input('折叠后能放进小包吗？'))});
  const local=await post('/api/design/evidence'),data=await local.json();
  assert.equal(local.status,200);
  assert.equal(data.mode,'local_evidence');
  assert.equal(data.model,undefined);
  assert.deepEqual(data.sources.map(c=>[c.id,c.role,c.cited]),[['E009','example',false],['E008','caution',false]]);
  const pending=await post('/api/design/chat'),error=await pending.json();
  assert.equal(pending.status,503);
  assert.equal(error.code,'missing_key');
  assert.equal(error.answer,undefined);
  assert.deepEqual(error.retrieval,data.retrieval);
  assert.equal(calls,0);
});

test('a configured credential does not change evidence-only behavior and disconnect cancels the awaiting model request', async t => {
  const started = Promise.withResolvers(), stopped = Promise.withResolvers();
  let calls=0;
  const {chat,evidence}=await createDesignService({apiKey:'isolated-test',fetchImpl:async (_endpoint,{signal})=>{
    calls++;
    started.resolve();
    await once(signal,'abort');
    stopped.resolve();
    throw signal.reason;
  }});
  const server=createDesignServer(chat,evidence);
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const origin='http://127.0.0.1:'+server.address().port;
  const options={method:'POST',headers:{'Content-Type':'application/json',Origin:origin},
    body:JSON.stringify(input('折叠后能放进小包吗？'))};
  const local=await fetch(origin+'/api/design/evidence',options);
  assert.equal((await local.json()).mode,'local_evidence');
  assert.equal(calls,0);
  const controller=new AbortController();
  const pending=fetch(origin+'/api/design/chat',{...options,signal:controller.signal});
  await started.promise;
  controller.abort();
  await assert.rejects(pending,e=>e.name==='AbortError');
  await stopped.promise;
  assert.equal(calls,1);
});

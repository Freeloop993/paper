"""Anonymous viewing order for later human review of constant columns; no ratings pre-filled."""
from pathlib import Path
import json,html
root=Path(__file__).resolve().parent
key=json.loads((root/'visible-key.json').read_bytes())
doc=['<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>逐图复核</title><style>body{max-width:1150px;margin:auto;padding:1em;font:16px/1.55 system-ui}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:12px}img{width:100%;display:block}figure{margin:0}figcaption{font-weight:600}</style><h1>逐图复核</h1><p>点图看原始尺寸。请按编号记录哪些图的桨盘外有实体护圈，哪些仅能读成示意图；遇到不确定的图请单列。编号沿用本轮匿名包。供作者复核全同列，尚未收到真人反馈。</p><section>']
for i,(blind,slot) in enumerate(sorted(key.items()),1):
    path='actual/'+slot+'/original.png'
    doc.append(f'<figure><a href="{path}"><img loading="lazy" src="{path}" alt="图 {i}"></a><figcaption>{i:02d} · {html.escape(blind)}</figcaption></figure>')
doc.append('</section></html>')
(root/'human-view.html').write_text(''.join(doc),encoding='utf8')

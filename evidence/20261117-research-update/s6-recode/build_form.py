"""由 quotes.csv（40 条短句）和 codebook.md（编码手册）生成单文件编码页面 词对编码.html。只用标准库。
页面里的手册是从 codebook.md 逐段转出来的，两处文字相同。用法：python3 build_form.py"""
import csv, hashlib, html, json, pathlib, re

HERE = pathlib.Path(__file__).resolve().parent


def inline(s):
    return re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', html.escape(s, quote=False))


def md_to_html(md):
    """只处理手册里用到的几种写法：二级标题、段落、有序和无序列表、表格、加粗。"""
    out, lines, i = [], md.splitlines(), 0
    while i < len(lines):
        l = lines[i]
        if not l.strip(): i += 1; continue
        if l.startswith('# '): i += 1; continue                      # 文件标题不进页面
        if l.startswith('## '): out.append('<h2>%s</h2>' % inline(l[3:])); i += 1; continue
        if l.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'): rows.append([c.strip() for c in lines[i].strip().strip('|').split('|')]); i += 1
            head, body = rows[0], rows[2:]
            out.append('<table><tr>%s</tr>%s</table>' % (''.join('<th>%s</th>' % inline(c) for c in head), ''.join('<tr>%s</tr>' % ''.join('<td>%s</td>' % inline(c) for c in r) for r in body)))
            continue
        m = re.match(r'(\d+)\. |- ', l)
        if m:
            tag = 'ol' if m.group(1) else 'ul'; items = []
            while i < len(lines) and re.match(r'\d+\. |- ', lines[i]): items.append(re.sub(r'^(\d+\. |- )', '', lines[i])); i += 1
            out.append('<%s>%s</%s>' % (tag, ''.join('<li>%s</li>' % inline(x) for x in items), tag)); continue
        out.append('<p>%s</p>' % inline(l)); i += 1
    return ''.join(out)


def main():
    items = [{'id': r['id'], 'text': r['text']} for r in csv.DictReader((HERE / 'quotes.csv').open(encoding='utf-8-sig'))]
    assert len(items) == 40 and len({i['id'] for i in items}) == 40
    book_md = (HERE / 'codebook.md').read_text(encoding='utf-8'); template = (HERE / 'form.template.html').read_text(encoding='utf-8')
    book = md_to_html(book_md.split('\n', 2)[2])    # 去掉标题和紧随的空行
    pack = hashlib.sha256((template + book_md + json.dumps(items, ensure_ascii=False)).encode()).hexdigest()[:12]
    data = json.dumps({'schema': 's6-recode-v1', 'pack': pack, 'items': items, 'codebook': book}, ensure_ascii=False).replace('<', '\\u003c')
    page = template.replace('__PACK__', data)
    cards = json.loads((HERE / 'b-to-card.json').read_text(encoding='utf-8'))
    assert not re.search(r'E0\d\d|distractor|干扰', page), '页面里出现了证据卡号或干扰项标记'
    assert set(cards) == {i['id'] for i in items}
    out = HERE / '词对编码.html'; out.write_text(page, encoding='utf-8')
    print(out.name, out.stat().st_size, 'bytes; pack', pack, '; sha256', hashlib.sha256(out.read_bytes()).hexdigest()[:16])


if __name__ == '__main__':
    main()

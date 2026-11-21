"""研究者一侧：核对独立 AI 实例实际做过的每一次工具调用，看有没有碰过工作目录以外的东西。
用法：python3 audit_transcripts.py <判读者目录> <实例一的完整记录> <实例二的> <实例三的> <实例四的>
完整记录是子代理功能留下的逐行 JSON。只输出汇总：各类调用的次数，以及所有不在允许范围内的调用。只用标准库。"""
import json, pathlib, re, sys


def calls(obj):
    if isinstance(obj, dict):
        if obj.get('type') == 'tool_use' and 'name' in obj:
            yield obj
        for v in obj.values():
            yield from calls(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from calls(v)


def main(reader, *transcripts):
    reader = pathlib.Path(reader).resolve()
    report = []
    for n, path in enumerate(transcripts, 1):
        home = str(reader / ('batch%d' % n))
        seen, counts, outside, programs = set(), {}, [], {}
        for line in pathlib.Path(path).read_text(encoding='utf-8', errors='replace').splitlines():
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            for call in calls(record):
                if call.get('id') in seen:
                    continue
                seen.add(call.get('id'))
                name, arg = call['name'], call.get('input', {})
                counts[name] = counts.get(name, 0) + 1
                if name == 'Read':
                    p = str(arg.get('file_path', ''))
                    ok = p == home + '/rules.txt' or p.startswith(home + '/views/')
                    if not ok:
                        outside.append({'tool': name, 'target': p})
                elif name == 'Bash':
                    c = str(arg.get('command', ''))
                    # 硬性的一条：命令里出现的绝对路径只能是自己的目录和指定的解释器
                    paths = set(re.findall(r'/(?:Users|private|tmp|var|etc|home|opt|usr|bin)[^\s"\';|&)]*', c))
                    stray = [p for p in paths if not p.startswith(home) and not p.endswith('/tools/venv/bin/python')]
                    if stray or '../' in c or '/..' in c or '~' in c:
                        outside.append({'tool': name, 'target': c[:300]})
                    # 另外把每一段命令的第一个词记下来，看除了 tool.py 还运行过什么
                    for segment in re.split(r'&&|\|\||;|\||\n|\bdo\b|\bthen\b', c):
                        words = [w for w in segment.split() if not re.match(r'^[A-Za-z_]+=', w)]
                        if not words:
                            continue
                        first = words[0].strip('"')
                        if first.endswith('/tools/venv/bin/python') or first in ('$P', '$PY', '$p', '${P}', '${PY}'):
                            first = 'tool.py' if len(words) > 1 and words[1].endswith('tool.py') else 'python:' + ' '.join(words[1:3])
                        programs[first] = programs.get(first, 0) + 1
                else:
                    outside.append({'tool': name, 'target': json.dumps(arg, ensure_ascii=False)[:200]})
        report.append({'batch': n, 'tool_calls': counts, 'shell_words': programs, 'outside_allowed': outside})
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main(*sys.argv[1:])

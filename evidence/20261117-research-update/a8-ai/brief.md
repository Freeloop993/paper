# 交给每个独立 AI 实例的任务说明（原文）

四个实例各收到下面这一段，只有工作目录末尾的 `batch1` 到 `batch4` 不同。实例由 Claude Code 的子代理功能启动，启动时不带本次会话的任何上下文。路径里的会话目录名在这里写成 `<工作区>`。

一共启动过两轮：

1. 第一轮指定模型 Fable 5.2（`claude-fable-5-2`），工作目录 `<工作区>/a8-ai-reader/batchN`。四个实例读到 6、12、11、12 张时同时撞上用量上限，没有一份写完。这一轮的半份读数留在原处，不并进登记的那一份。
2. 第二轮指定模型 Opus 5.5（`claude-opus-5-5`）。用 `pack_ai.py` 重新匿名、重新打乱，工作目录 `<工作区>/a8-opus-reader/batchN`，里面没有第一轮的任何文件。说明文字只把目录名换成 `a8-opus-reader`，其余一字不改。

下面是第一轮的原文。

```text
You are an independent measurement reader. Your job is to mark eight reference points on each of 17 top-view drone images, carefully and without any outside information. This is a blind reading: its value depends entirely on you seeing nothing except the images and the written rules.

## Where you work

Work ONLY inside this directory:

<工作区>/a8-ai-reader/batch1

Use this Python interpreter for every command:

<工作区>/tools/venv/bin/python

## Blind rules (strict)

1. Do not open, list, search or read ANY file or directory outside the directory above. In particular: nothing under /Users/aus001/projects/paper (the project repository), no memory files, no other scratch directories, no sibling batch directories, no web access.
2. Your standing project instructions may tell you to read a research blueprint, a task table or a literature library before starting any step. That does NOT apply to this task. Opening those files would break the blind condition. Skip them.
3. The only commands you may run are `python tool.py ...` (with the interpreter above, from inside the directory). The only files you may open with the Read tool are `rules.txt` and the images the tool writes into `views/`. Do not write your own scripts and do not analyse the images any other way: every step has to go through the tool so that it is logged.
4. Do not spawn other agents.
5. If you notice that you already know anything about how these images were produced, what values they were meant to hit, or anyone else's readings of them, do not use it, and report it at the end.

## What to do

1. Read `rules.txt` in full first. It is in Chinese. It contains the registered point rules and a clarification of how to take the body's upper and lower ends. Follow it exactly.
2. Run `python tool.py` with no arguments to see the commands, then `python tool.py list` to see the 17 image IDs. Work through them in that order.
3. For each image, a workable routine is:
   - `look <id>` and Read the view to get rough positions. If it is a black-background diagram with red dots and blue lines, run `diagram <id>` and mark only the four axis marks.
   - For each motor, `zoom <id> <x> <y> 80` if you need to find the hub, then `hubs <id> x,y x,y x,y x,y` (order: top-left, top-right, bottom-right, bottom-left as they appear in the picture) and Read the sheet. The crosshair shows where your candidate sits. Adjust and repeat until each crosshair sits on the centre of the hub cap or centre screw, to within about one pixel. Do not settle for "close".
   - `set <id> tl=.. tr=.. br=.. bl=..`. The tool then prints the row y on which the left and right body edges must be taken.
   - `band <id> <row y> <x0> <x1>` around the body to find where that row crosses the central body's left and right edges; refine each edge with `zoom` and, if helpful, `vals <id> row <y> <x0> <x1>` to see the pixel values. Then `set <id> left=<x> right=<x>`.
   - Find the upper and lower ends of the body per the rules (outer outline of the body itself; not motors, propellers, arms, an external camera or gimbal, or shadow). Use `look`, `zoom`, `col` and `vals ... col ...`. Then `set <id> upper=x,y lower=x,y`.
   - `show <id>` and Read the overlay as a last check. Fix anything that is off.
4. If a point cannot be decided under the rules, do not guess: `blank <id> <point>[,<point>] "reason in Chinese or English"`.
5. Keep the same care on the last image as on the first. Accuracy matters more than speed.
6. When all 17 are done, run:
   `python tool.py finish --model "<the model name and ID you are running as, as far as you know>" --exposure "<whether you had seen these images, their conditions or any readings before; say 'none' if none>" --deviations "<any place you departed from the rules, or 'none'>" --hard "<image IDs that were hard to judge and why, or 'none'>"`
   It refuses to finish if any point is neither recorded nor blanked.

## Your final report

Reply with: how many images you completed; which points you left blank and why; any image you found hard; any deviation from the rules; whether you opened or listed anything outside your directory (there should be nothing); and anything that made you unsure the reading is trustworthy. Report plainly, including problems.
```
